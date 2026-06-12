from datetime import datetime
from fastapi import APIRouter, Query
from api.core_client import call as core_call
from api.cache import make_key, get_cached, set_cached
from api.ml.congestion import predict_congestion, get_hourly_forecast
from api.services.tomtom import traffic_available

router = APIRouter()


@router.get("/predict/congestion")
def get_congestion(
    hora: int = Query(None, ge=0, le=23),
    comuna: str = Query(None, description="Nombre de la comuna"),
    lat: float = Query(None, ge=6.0, le=6.5),
    lng: float = Query(None, ge=-75.7, le=-75.4),
):
    now = datetime.now()
    result = core_call("predict_congestion", {
        "hora": hora if hora is not None else now.hour,
        "dia_semana": now.weekday(),
        "comuna": comuna,
        "lat": lat,
        "lng": lng,
    })
    result["timestamp"] = now.isoformat()
    return result


@router.get("/predict/congestion/forecast")
def get_congestion_forecast(
    comuna: str = Query(None, description="Nombre de la comuna"),
    lat: float = Query(None, ge=6.0, le=6.5),
    lng: float = Query(None, ge=-75.7, le=-75.4),
):
    cache_key = make_key("forecast", comuna or "all", lat or 0, lng or 0)
    cached = get_cached(cache_key)
    if cached:
        return cached
    result = core_call("congestion_forecast", {
        "comuna": comuna,
        "lat": lat,
        "lng": lng,
    })
    response = {
        "comuna": comuna,
        "timestamp": datetime.now().isoformat(),
        "forecast": result if isinstance(result, list) else result.get("forecast", result),
    }
    set_cached(cache_key, response, ttl=120)
    return response


@router.get("/predict/zonas-criticas")
def get_zonas_criticas(
    eps: float = Query(0.008, description="Radio de agrupación en grados (~500m)"),
    min_samples: int = Query(3, ge=2, description="Mínimo de puntos por cluster"),
):
    return core_call("zonas_criticas", {"eps": eps, "min_samples": min_samples})


@router.get("/predict/ruta-segura")
def get_ruta_segura(
    origen_lat: float = Query(..., ge=6.0, le=6.5),
    origen_lng: float = Query(..., ge=-75.7, le=-75.4),
    dest_lat: float = Query(..., ge=6.0, le=6.5),
    dest_lng: float = Query(..., ge=-75.7, le=-75.4),
):
    return core_call("ruta_segura", {
        "origen_lat": origen_lat,
        "origen_lng": origen_lng,
        "dest_lat": dest_lat,
        "dest_lng": dest_lng,
    })


@router.get("/predict/comprehensive")
def get_comprehensive(
    hora: int = Query(None, ge=0, le=23),
    comuna: str = Query(None),
    lat: float = Query(None, ge=6.0, le=6.5),
    lng: float = Query(None, ge=-75.7, le=-75.4),
):
    now = datetime.now()
    h = hora if hora is not None else now.hour
    c = predict_congestion(lat=lat, lng=lng, comuna=comuna, hora=h)
    forecast = get_hourly_forecast(lat=lat, lng=lng, comuna=comuna)
    zonas = core_call("zonas_criticas", {"eps": 0.008, "min_samples": 3})
    return {
        "timestamp": now.isoformat(),
        "hora": h,
        "comuna": comuna,
        "lat": lat,
        "lng": lng,
        "congestion": c,
        "forecast_24h": forecast,
        "zonas_criticas": zonas,
        "trafico_disponible": traffic_available(),
    }
