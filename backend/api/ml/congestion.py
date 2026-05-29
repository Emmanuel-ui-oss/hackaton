import numpy as np
from datetime import datetime, timedelta
from django.utils import timezone

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
    "Comuna 10 - La Candelaria": 1.3,
    "Comuna 14 - El Poblado": 1.2,
    "Comuna 11 - Laureles": 1.15,
    "Comuna 15 - Guayabal": 1.1,
    "Comuna 16 - Belén": 1.05,
    "Comuna 7 - Robledo": 1.0,
    "Comuna 13 - San Javier": 0.95,
    "Comuna 5 - Castilla": 1.1,
    "Comuna 4 - Aranjuez": 1.0,
    "Comuna 3 - Manrique": 0.95,
    "Comuna 1 - Popular": 0.85,
    "Comuna 2 - Santa Cruz": 0.85,
    "Comuna 6 - Doce de Octubre": 0.9,
    "Comuna 8 - Villa Hermosa": 0.9,
    "Comuna 9 - Buenos Aires": 0.85,
    "Comuna 12 - La América": 0.95,
}

DEF_FACTOR = 1.0


def predict_congestion(hora: int, dia_semana: int, comuna: str = None) -> dict:
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

    ruido = np.random.normal(0, 0.03)
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
    }


def _get_nivel(prob: float) -> str:
    if prob >= 0.80:
        return "critico"
    if prob >= 0.60:
        return "alto"
    if prob >= 0.35:
        return "medio"
    return "bajo"


def get_hourly_forecast(comuna: str = None) -> list:
    now = timezone.now()
    dia_semana = now.weekday()
    predictions = []
    for h in range(24):
        pred = predict_congestion(h, dia_semana, comuna)
        pred["hora_label"] = f"{h:02d}:00"
        predictions.append(pred)
    return predictions
