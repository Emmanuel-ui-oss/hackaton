"""
Utilidades para consultar servicios REST ArcGIS de la Alcaldía de Medellín.
Usa `f=geojson` para obtener coordenadas WGS84 directamente.
"""
import logging, httpx
from datetime import datetime, timedelta, timezone as dt_timezone
from django.utils import timezone

log = logging.getLogger("arcgis")

ARCGIS_BASE = "https://www.medellin.gov.co/servidormapas/rest/services"

# --- Fuentes ArcGIS configuradas ---
# Cada entrada: (nombre_corto, url_layer, tipo_evento, nivel_default, radio_default, vigencia_horas, mapping_fn)
#
# mapping_fn: recibe properties dict, retorna (titulo, descripcion) o None si debe saltarse

def _map_alarmas(props: dict):
    return (
        props.get("nombre_siata", "Sensor SIATA").strip(),
        f"Subcuenca: {props.get('subcuenca', 'N/A')} | Comuna: {props.get('nombre_comuna_corr', 'N/A')} | Barrio: {props.get('nombre_barrio_vereda', 'N/A')}",
    )

def _map_inspecciones(props: dict):
    return (
        props.get("tramo", "Inspección SIRE").strip(),
        f"Sector: {props.get('sector', 'N/A')} | Quebrada: {props.get('quebrada', 'N/A')} | Punto: {props.get('punto_encuentro', 'N/A')}",
    )

def _map_sensores(props: dict):
    return (
        props.get("nombre_siata", "Sensor de Nivel").strip(),
        f"Subcuenca: {props.get('subcuenca', 'N/A')} | Comuna: {props.get('nombre_comuna_corr', 'N/A')}",
    )

def _map_cierres(props: dict):
    tipo = props.get("tipo_cierre", "Total")
    desc = props.get("descripcion", "").strip()
    titulo = f"Cierre {tipo} - {desc[:60]}" if desc else f"Cierre Vial {tipo}"
    return (titulo, desc)

ARCGIS_SOURCES = [
    {
        "id": "dagrd_alarmas",
        "nombre": "DAGRD Alarmas",
        "url": f"{ARCGIS_BASE}/ambiente_dllo_sost/VM_DAGRD/MapServer/14/query",
        "tipo": "monitoreo",
        "nivel": "medio",
        "radio": 300,
        "vigencia": 720,  # 30 días — son sensores fijos
        "fuente": "arcgis_dagrd",
        "map_fn": _map_alarmas,
    },
    {
        "id": "dagrd_inspecciones",
        "nombre": "DAGRD Inspecciones SIRE",
        "url": f"{ARCGIS_BASE}/ambiente_dllo_sost/VM_DAGRD/MapServer/15/query",
        "tipo": "inspeccion",
        "nivel": "medio",
        "radio": 200,
        "vigencia": 720,
        "fuente": "arcgis_dagrd",
        "map_fn": _map_inspecciones,
    },
    {
        "id": "dagrd_sensores",
        "nombre": "DAGRD Sensores de Nivel",
        "url": f"{ARCGIS_BASE}/ambiente_dllo_sost/VM_DAGRD/MapServer/16/query",
        "tipo": "monitoreo",
        "nivel": "medio",
        "radio": 150,
        "vigencia": 720,
        "fuente": "arcgis_dagrd",
        "map_fn": _map_sensores,
    },
    {
        "id": "cierres_vivo",
        "nombre": "Cierres en Vivo",
        "url": f"{ARCGIS_BASE}/transporte/VM_Cierres_Movilidad/MapServer/0/query",
        "tipo": "cierre_vial",
        "nivel": "alto",
        "radio": 50,
        "vigencia": 6,
        "fuente": "arcgis_cierres",
        "map_fn": _map_cierres,
    },
]


def query_layer(url: str, where: str = "1=1", out_fields: str = "*",
                max_records: int = 2000, timeout: int = 20) -> list:
    """
    Consulta un layer ArcGIS REST, retorna lista de features GeoJSON.
    """
    params = f"?where={where}&outFields={out_fields}&returnGeometry=true&f=geojson&resultRecordCount={max_records}"
    full_url = url + params
    try:
        resp = httpx.get(full_url, timeout=timeout)
        resp.raise_for_status()
        body = resp.json()
        features = body.get("features", [])
        exceeded = body.get("properties", {}).get("exceededTransferLimit", False)
        if exceeded:
            log.warning(f"ArcGIS {url}: transfer limit exceeded ({max_records} records)")
        log.info(f"ArcGIS query OK — {len(features)} features from {url.split('/')[-3]}/{url.split('/')[-1]}")
        return features
    except Exception as e:
        log.warning(f"ArcGIS query failed: {url} — {e}")
        return []


def feature_to_event(feature: dict, source: dict) -> dict | None:
    """
    Convierte un feature GeoJSON de ArcGIS a dict compatible con EventoRiesgo.
    Retorna None si el feature debe saltarse.
    """
    props = feature.get("properties", {})
    geometry = feature.get("geometry")

    if not geometry or not props:
        return None

    # Extraer coordenadas WGS84 del GeoJSON
    geom_type = geometry.get("type")
    if geom_type == "Point":
        coords = geometry.get("coordinates")
        if not coords or len(coords) < 2:
            return None
        lng, lat = coords[0], coords[1]
    else:
        # Para polilineas/polígonos, usar el centroide
        # O saltar — para MVP solo manejamos puntos
        log.debug(f"Skipping non-point geometry: {geom_type}")
        return None

    map_fn = source.get("map_fn")
    if not map_fn:
        return None

    result = map_fn(props)
    if result is None:
        return None
    titulo, descripcion = result

    if not titulo:
        return None

    # Usar objectid como id externo único
    objectid = props.get("objectid") or feature.get("id")

    return {
        "tipo": source["tipo"],
        "nivel": source["nivel"],
        "fuente": source["fuente"],
        "titulo": titulo,
        "descripcion": descripcion,
        "latitud": round(lat, 6),
        "longitud": round(lng, 6),
        "radio_impacto_metros": source["radio"],
        "activo": True,
        "expira_en": timezone.now() + timedelta(hours=source["vigencia"]),
        "datos_raw": {
            "source_id": source["id"],
            "objectid": objectid,
            "raw_properties": props,
        },
    }


def ingest_all_sources() -> int:
    """
    Consulta todas las fuentes ArcGIS configuradas y crea/actualiza EventoRiesgo.
    Retorna total de eventos creados.
    """
    from apps.core.models import EventoRiesgo

    total = 0
    skip_reasons = {"sin_coords": 0, "sin_titulo": 0}

    for source in ARCGIS_SOURCES:
        features = query_layer(source["url"])
        if not features:
            log.info(f"[arcgis] {source['id']}: sin features")
            continue

        creados = 0
        for feature in features:
            try:
                event = feature_to_event(feature, source)
                if event is None:
                    continue

                objid = event["datos_raw"]["objectid"]
                if objid is None:
                    # Sin objectid, crear siempre
                    EventoRiesgo.objects.create(**event)
                    creados += 1
                    continue

                # update_or_create por fuente + objectid en datos_raw
                existing = EventoRiesgo.objects.filter(
                    fuente=event["fuente"],
                    datos_raw__source_id=source["id"],
                    datos_raw__objectid=objid,
                ).first()

                if existing:
                    # Actualizar coordenadas, nivel, expiración
                    for key, val in event.items():
                        setattr(existing, key, val)
                    existing.save()
                else:
                    EventoRiesgo.objects.create(**event)
                    creados += 1

            except Exception as e:
                log.warning(f"[arcgis] error procesando feature de {source['id']}: {e}")

        log.info(f"[arcgis] {source['id']}: {creados} eventos creados/actualizados")
        total += creados

    return total
