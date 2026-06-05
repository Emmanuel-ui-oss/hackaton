import os, pickle, logging, time as time_module
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from django.utils import timezone
from django.db.models import Count

log = logging.getLogger("ml.congestion")

_weather_cache = {"factor": 1.0, "ts": 0}
_WEATHER_CACHE_TTL = 300

_prophet_model = None
_MODEL_PATH = Path(__file__).resolve().parent / "models" / "prophet_congestion.pkl"

TZ = timezone.get_current_timezone()

HISTORICAL_PATTERNS = {
    "lunes": {"base": 0.65, "peak_am": 0.85, "peak_pm": 0.90, "night": 0.20},
    "martes": {"base": 0.60, "peak_am": 0.80, "peak_pm": 0.85, "night": 0.18},
    "miercoles": {"base": 0.60, "peak_am": 0.80, "peak_pm": 0.85, "night": 0.18},
    "jueves": {"base": 0.62, "peak_am": 0.82, "peak_pm": 0.88, "night": 0.22},
    "viernes": {"base": 0.68, "peak_am": 0.83, "peak_pm": 0.92, "night": 0.30},
    "sabado": {"base": 0.40, "peak_am": 0.55, "peak_pm": 0.70, "night": 0.35},
    "domingo": {"base": 0.30, "peak_am": 0.40, "peak_pm": 0.50, "night": 0.15},
}
DIAS_ES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

COMUNA_FACTORS = {
    "Comuna 10 - La Candelaria": 1.3, "Comuna 14 - El Poblado": 1.2,
    "Comuna 11 - Laureles": 1.15, "Comuna 15 - Guayabal": 1.1,
    "Comuna 16 - Belén": 1.05, "Comuna 7 - Robledo": 1.0,
    "Comuna 13 - San Javier": 0.95, "Comuna 5 - Castilla": 1.1,
    "Comuna 4 - Aranjuez": 1.0, "Comuna 3 - Manrique": 0.95,
    "Comuna 1 - Popular": 0.85, "Comuna 2 - Santa Cruz": 0.85,
    "Comuna 6 - Doce de Octubre": 0.9, "Comuna 8 - Villa Hermosa": 0.9,
    "Comuna 9 - Buenos Aires": 0.85, "Comuna 12 - La América": 0.95,
}
DEF_FACTOR = 1.0

HORA_WEIGHT = [0.3, 0.2, 0.2, 0.2, 0.3, 0.4, 0.5, 0.8, 1.0, 0.9, 0.7, 0.6,
               0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.0, 0.8, 0.6, 0.5, 0.4, 0.3]


def _load_prophet_model():
    global _prophet_model
    if _prophet_model is not None:
        return _prophet_model
    if not _MODEL_PATH.exists():
        log.info("Modelo Prophet no encontrado, usando heurístico")
        return None
    try:
        with open(_MODEL_PATH, "rb") as f:
            _prophet_model = pickle.load(f)
        log.info("Modelo Prophet cargado exitosamente")
    except Exception as e:
        log.warning(f"Error cargando modelo Prophet: {e}")
        _prophet_model = None
    return _prophet_model


def _prophet_predict(hora, dia_semana):
    """Predice congestión con Prophet. Retorna None si no disponible."""
    model = _load_prophet_model()
    if model is None:
        return None
    try:
        now = timezone.now()
        days_ahead = (dia_semana - now.weekday()) % 7
        target = now.replace(hour=hora, minute=0, second=0, microsecond=0)
        target += timedelta(days=days_ahead)
        target_naive = target.astimezone(TZ).replace(tzinfo=None)

        import pandas as pd
        future = pd.DataFrame({"ds": [target_naive]})
        forecast = model.predict(future)
        prob = float(forecast["yhat"].iloc[0])
        return max(0.0, min(1.0, prob))
    except Exception as e:
        log.warning(f"Error en predicción Prophet: {e}")
        return None


def _heuristic_prob(hora: int, dia_semana: int) -> float:
    dia_nombre = DIAS_ES[dia_semana] if 0 <= dia_semana <= 6 else "lunes"
    pattern = HISTORICAL_PATTERNS.get(dia_nombre, HISTORICAL_PATTERNS["lunes"])
    if 7 <= hora <= 9:
        prob = pattern["peak_am"]
    elif 17 <= hora <= 19:
        prob = pattern["peak_pm"]
    elif 22 <= hora or hora <= 5:
        prob = pattern["night"]
    else:
        prob = pattern["base"]
    return prob * HORA_WEIGHT[hora]


def predict_congestion(hora: int, dia_semana: int, comuna: str = None) -> dict:
    dia_nombre = DIAS_ES[dia_semana] if 0 <= dia_semana <= 6 else "lunes"

    heuristic_prob = _heuristic_prob(hora, dia_semana)
    ml_prob = _prophet_predict(hora, dia_semana)

    if ml_prob is not None:
        prob = 0.4 * ml_prob + 0.6 * heuristic_prob
        modelo = "prophet"
    else:
        prob = heuristic_prob
        modelo = "heuristico"

    incident_factor = _get_recent_incidents_factor(comuna)
    prob *= incident_factor

    weather_factor = _get_weather_factor()
    prob *= weather_factor

    ruido = np.random.normal(0, 0.02)
    prob = max(0.0, min(1.0, prob + ruido))

    comuna_factor = COMUNA_FACTORS.get(comuna, DEF_FACTOR) if comuna else DEF_FACTOR
    prob = min(1.0, prob * comuna_factor)

    nivel = _get_nivel(prob)

    return {
        "probabilidad": round(prob * 100, 1),
        "nivel": nivel,
        "hora": hora,
        "dia": dia_nombre,
        "comuna": comuna,
        "modelo": modelo,
    }


def _get_nivel(prob: float) -> str:
    if prob >= 0.80: return "critico"
    if prob >= 0.60: return "alto"
    if prob >= 0.35: return "medio"
    return "bajo"


def _get_recent_incidents_factor(comuna: str = None) -> float:
    from apps.core.models import EventoRiesgo
    cutoff = timezone.now() - timedelta(hours=6)
    qs = EventoRiesgo.objects.filter(activo=True, creado__gte=cutoff)
    if comuna:
        qs = qs.filter(titulo__icontains=comuna.split(" - ")[0])
    count = qs.count()
    factor = 0.9 + min(count, 10) * 0.04
    return min(factor, 1.3)


def _get_weather_factor() -> float:
    global _weather_cache
    now_time = time_module.time()
    if now_time - _weather_cache["ts"] < _WEATHER_CACHE_TTL:
        return _weather_cache["factor"]
    try:
        import httpx
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude=6.2476&longitude=-75.5658"
            f"&current=precipitation,weather_code"
            f"&timezone=America%2FBogota&forecast_days=1"
        )
        resp = httpx.get(url, timeout=5)
        data = resp.json()
        precip = data.get("current", {}).get("precipitation", 0)
        wcode = data.get("current", {}).get("weather_code", 0)

        if wcode >= 95 or precip > 5:
            factor = 1.3
        elif wcode >= 80 or precip > 1:
            factor = 1.15
        elif precip > 0:
            factor = 1.05
        else:
            factor = 1.0

        _weather_cache = {"factor": factor, "ts": now_time}
        return factor
    except Exception:
        return 1.0


def get_hourly_forecast(comuna: str = None) -> list:
    now = timezone.now()
    dia_semana = now.weekday()
    predictions = []
    for h in range(24):
        pred = predict_congestion(h, dia_semana, comuna)
        pred["hora_label"] = f"{h:02d}:00"
        predictions.append(pred)
    return predictions
