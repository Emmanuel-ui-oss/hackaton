import numpy as np
from sklearn.cluster import DBSCAN
from django.db.models import Count
from apps.core.models import ReporteIncidente, ZonaRiesgo, EventoRiesgo


def detect_critical_zones(eps: float = 0.008, min_samples: int = 3) -> list:
    reportes = list(
        ReporteIncidente.objects.filter(activo=True).values("latitud", "longitud", "tipo", "descripcion")
    )
    eventos = list(
        EventoRiesgo.objects.filter(activo=True).values("latitud", "longitud", "tipo", "titulo")
    )

    puntos = []
    for r in reportes:
        puntos.append({"lat": r["latitud"], "lng": r["longitud"], "tipo": r["tipo"], "label": r["descripcion"][:80], "fuente": "reporte"})
    for e in eventos:
        puntos.append({"lat": e["latitud"], "lng": e["longitud"], "tipo": e["tipo"], "label": e["titulo"][:80], "fuente": "evento"})

    if len(puntos) < min_samples:
        return {"clusters": [], "total_puntos": len(puntos), "mensaje": "Datos insuficientes para clustering"}

    coords = np.array([[p["lat"], p["lng"]] for p in puntos])

    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(coords)
    labels = clustering.labels_

    clusters = {}
    for i, label in enumerate(labels):
        if label == -1:
            continue
        if label not in clusters:
            clusters[label] = {"puntos": [], "centro_lat": 0.0, "centro_lng": 0.0, "tipos": set()}
        clusters[label]["puntos"].append(puntos[i])
        clusters[label]["tipos"].add(puntos[i]["tipo"])

    resultado = []
    for label, data in clusters.items():
        lats = np.array([p["lat"] for p in data["puntos"]])
        lngs = np.array([p["lng"] for p in data["puntos"]])
        centro_lat = float(lats.mean())
        centro_lng = float(lngs.mean())
        max_dist = float(np.sqrt((lats - centro_lat) ** 2 + (lngs - centro_lng) ** 2).max())
        radio = max(max_dist * 111320, 200)
        nivel = _calc_nivel(len(data["puntos"]))
        resultado.append({
            "id": int(label),
            "centro": {"lat": round(centro_lat, 6), "lng": round(centro_lng, 6)},
            "radio_metros": int(radio),
            "total_incidentes": len(data["puntos"]),
            "nivel": nivel,
            "tipos": list(data["tipos"]),
        })

    resultado.sort(key=lambda x: x["total_incidentes"], reverse=True)
    return {"clusters": resultado, "total_puntos": len(puntos), "total_clusters": len(resultado)}


def _calc_nivel(count: int) -> str:
    if count >= 8:
        return "critico"
    if count >= 5:
        return "alto"
    if count >= 3:
        return "medio"
    return "bajo"


_EVENTO_TIPO_MAP = {
    "inundacion": "INUNDACION",
    "deslizamiento": "DESLIZAMIENTO",
    "incendio": "OTRO",
    "accidente_vial": "ACCIDENTE",
    "monitoreo": "MONITOREO",
    "inspeccion": "INSPECCION",
    "cierre_vial": "CIERRE",
}

_FUENTES_REALES = ("arcgis_dagrd", "arcgis_cierres", "usuario", "simur", "dagrd")


def auto_create_zonas(radio_km: float = 0.5) -> int:
    """
    Crea ZonaRiesgo automáticamente desde EventoRiesgo de fuentes reales.
    Por cada evento sin zona cercana existente, crea una nueva.
    Retorna cuantas zonas fueron creadas.
    """
    from django.utils import timezone
    from django.db.models import Q
    from apps.core.models import EventoRiesgo, ZonaRiesgo
    from api.utils.geo import haversine

    now = timezone.now()
    eventos = list(EventoRiesgo.objects.filter(
        activo=True,
        fuente__in=_FUENTES_REALES,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=now)
    ).values("id", "tipo", "titulo", "descripcion", "latitud", "longitud",
             "radio_impacto_metros", "fuente", "datos_raw"))

    existing = list(ZonaRiesgo.objects.filter(activo=True).values(
        "id", "latitud", "longitud", "radio_metros"))

    creadas = 0
    seen_coords = set()

    for ev in eventos:
        key = (round(ev["latitud"], 5), round(ev["longitud"], 5))
        if key in seen_coords:
            continue
        seen_coords.add(key)

        near = False
        for z in existing:
            d = haversine(ev["latitud"], ev["longitud"], z["latitud"], z["longitud"])
            if d <= (z["radio_metros"] or 500) / 1000:
                near = True
                break

        if near:
            continue

        comuna = ""
        if ev.get("datos_raw") and isinstance(ev["datos_raw"], dict):
            raw = ev["datos_raw"]
            if raw.get("raw_properties"):
                comuna = raw["raw_properties"].get("nombre_comuna_corr", "")

        tipo_riesgo = _EVENTO_TIPO_MAP.get(ev["tipo"], "OTRO")

        zona = ZonaRiesgo.objects.create(
            nombre=ev["titulo"][:200] if ev["titulo"] else f"Zona - {ev['tipo']}",
            comuna=str(comuna)[:100] if comuna else "",
            descripcion=ev["descripcion"][:200] if ev["descripcion"] else "",
            tipo_riesgo=tipo_riesgo,
            nivel="MEDIO",
            latitud=ev["latitud"],
            longitud=ev["longitud"],
            radio_metros=ev["radio_impacto_metros"] or 300,
            activo=True,
        )
        existing.append({
            "id": zona.id,
            "latitud": zona.latitud,
            "longitud": zona.longitud,
            "radio_metros": zona.radio_metros,
        })
        creadas += 1

    return creadas
