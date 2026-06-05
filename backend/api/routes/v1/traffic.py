import logging
from datetime import datetime
from fastapi import APIRouter, Query
from api.services.tomtom import traffic_available, get_tile_url, fetch_traffic_incidents
from api.ml.congestion import predict_congestion
from apps.core.models import ZonaRiesgo

DIAS_ES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

router = APIRouter()
log = logging.getLogger("traffic")


@router.get("/traffic/config")
def traffic_config():
    return {
        "available": traffic_available(),
        "tile_url": get_tile_url(),
        "source": "tomtom",
    }


@router.get("/traffic/incidents")
async def traffic_incidents(
    bbox_west: float = Query(-75.7, alias="w"),
    bbox_south: float = Query(6.1, alias="s"),
    bbox_east: float = Query(-75.4, alias="e"),
    bbox_north: float = Query(6.4, alias="n"),
):
    return await fetch_traffic_incidents(bbox_west, bbox_south, bbox_east, bbox_north)


@router.get("/trafico/mapa")
def trafico_mapa():
    ahora = datetime.now()
    zonas = ZonaRiesgo.objects.filter(activo=True)
    comunas = []
    niveles = {"critico": 0, "alto": 0, "medio": 0, "bajo": 0}
    for z in zonas:
        pred = predict_congestion(lat=z.latitud, lng=z.longitud, comuna=z.comuna)
        nivel = pred["nivel"]
        niveles[nivel] = niveles.get(nivel, 0) + 1
        comunas.append({
            "comuna": z.comuna,
            "nombre": z.nombre,
            "probabilidad": pred["probabilidad"],
            "nivel": nivel,
            "latitud": float(z.latitud),
            "longitud": float(z.longitud),
            "radio_metros": z.radio_metros or 500,
        })
    overall = max(niveles, key=niveles.get) if any(niveles.values()) else "bajo"
    return {
        "timestamp": ahora.isoformat(),
        "hora": ahora.hour,
        "dia": DIAS_ES[ahora.weekday()] if 0 <= ahora.weekday() <= 6 else "lunes",
        "overall": overall,
        "comunas": comunas,
    }
