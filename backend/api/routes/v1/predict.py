from datetime import datetime
from fastapi import APIRouter, Query
from api.ml.congestion import predict_congestion, get_hourly_forecast
from api.ml.clustering import detect_critical_zones
from api.ml.routes import safe_route

router = APIRouter()


@router.get("/predict/congestion")
def get_congestion(
    hora: int = Query(None, ge=0, le=23),
    comuna: str = Query(None, description="Nombre de la comuna"),
):
    now = datetime.now()
    dia_semana = now.weekday()
    hora_actual = hora if hora is not None else now.hour
    result = predict_congestion(hora_actual, dia_semana, comuna)
    result["timestamp"] = now.isoformat()
    return result


@router.get("/predict/congestion/forecast")
def get_congestion_forecast(
    comuna: str = Query(None, description="Nombre de la comuna"),
):
    forecast = get_hourly_forecast(comuna)
    return {
        "comuna": comuna,
        "timestamp": datetime.now().isoformat(),
        "forecast": forecast,
    }


@router.get("/predict/zonas-criticas")
def get_zonas_criticas(
    eps: float = Query(0.008, description="Radio de agrupación en grados (~500m)"),
    min_samples: int = Query(3, ge=2, description="Mínimo de puntos por cluster"),
):
    return detect_critical_zones(eps=eps, min_samples=min_samples)


@router.get("/predict/ruta-segura")
def get_ruta_segura(
    origen_lat: float = Query(..., ge=6.0, le=6.5),
    origen_lng: float = Query(..., ge=-75.7, le=-75.4),
    dest_lat: float = Query(..., ge=6.0, le=6.5),
    dest_lng: float = Query(..., ge=-75.7, le=-75.4),
):
    return safe_route(origen_lat, origen_lng, dest_lat, dest_lng)
