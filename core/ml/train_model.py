"""
Entrena modelo Prophet para predicción de congestión vial en Medellín.
Usa datos históricos de EventoRiesgo + patrones horarios.
"""
import os, sys, json, pickle, logging
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

import django
django.setup()

import numpy as np
import pandas as pd
from prophet import Prophet
from django.utils import timezone
from django.db.models import Count
from django.db.models.functions import TruncHour
from apps.core.models import EventoRiesgo

TZ = timezone.get_current_timezone()

log = logging.getLogger("ml.train")

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(exist_ok=True)

DIAS_ES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

HISTORICAL_PATTERNS = {
    "lunes": {"base": 0.65, "peak_am": 0.85, "peak_pm": 0.90, "night": 0.20},
    "martes": {"base": 0.60, "peak_am": 0.80, "peak_pm": 0.85, "night": 0.18},
    "miercoles": {"base": 0.60, "peak_am": 0.80, "peak_pm": 0.85, "night": 0.18},
    "jueves": {"base": 0.62, "peak_am": 0.82, "peak_pm": 0.88, "night": 0.22},
    "viernes": {"base": 0.68, "peak_am": 0.83, "peak_pm": 0.92, "night": 0.30},
    "sabado": {"base": 0.40, "peak_am": 0.55, "peak_pm": 0.70, "night": 0.35},
    "domingo": {"base": 0.30, "peak_am": 0.40, "peak_pm": 0.50, "night": 0.15},
}


def build_training_data(hours_back=720, blend_synthetic=True):
    """Construye serie temporal completa (huecos rellenos con sintéticos)."""
    now = timezone.now()
    cutoff = now - timezone.timedelta(hours=hours_back)

    qs = (
        EventoRiesgo.objects
        .filter(creado__gte=cutoff)
        .annotate(hora=TruncHour("creado"))
        .values("hora")
        .annotate(total=Count("id"))
        .order_by("hora")
    )

    real_counts = {}
    for row in qs:
        real_counts[row["hora"]] = row["total"]

    synthetic = _generate_synthetic_data(hours_back)
    syn_map = {row["ds"]: row["y"] for _, row in synthetic.iterrows()}

    max_real = max(real_counts.values()) if real_counts else 1

    rows = []
    for h in range(hours_back):
        t = now - timezone.timedelta(hours=h)
        ts = t.replace(minute=0, second=0, microsecond=0)
        ts_naive = ts.astimezone(TZ).replace(tzinfo=None)

        if ts in real_counts:
            y = real_counts[ts] / max_real
        elif blend_synthetic and ts_naive in syn_map:
            y = syn_map[ts_naive] * 0.5
        else:
            y = syn_map.get(ts_naive, 0.1) if blend_synthetic else 0.01

        rows.append({"ds": ts_naive, "y": max(0.01, min(1.0, y))})

    df = pd.DataFrame(rows)
    df.sort_values("ds", inplace=True)
    df.drop_duplicates(subset="ds", keep="first", inplace=True)

    n_real = sum(1 for ts in real_counts if ts in set(df["ds"]))
    log.info(f"Datos entrenamiento: {len(df)} filas ({n_real} reales, {len(df) - n_real} sintéticos)")
    return df


def _generate_synthetic_data(hours_back=720):
    """Genera datos sintéticos realistas para entrenar el modelo inicial."""
    now = timezone.now()
    rows = []
    for h in range(hours_back):
        t = now - timezone.timedelta(hours=h)
        ts_naive = t.astimezone(TZ).replace(tzinfo=None)
        dia = DIAS_ES[t.weekday()]
        pattern = HISTORICAL_PATTERNS.get(dia, HISTORICAL_PATTERNS["lunes"])

        if 7 <= t.hour <= 9:
            prob = pattern["peak_am"]
        elif 17 <= t.hour <= 19:
            prob = pattern["peak_pm"]
        elif 22 <= t.hour or t.hour <= 5:
            prob = pattern["night"]
        else:
            prob = pattern["base"]

        ruido = np.random.normal(0, 0.02)
        prob = max(0.05, min(1.0, prob + ruido))
        rows.append({"ds": ts_naive, "y": prob})

    df = pd.DataFrame(rows)
    df.sort_values("ds", inplace=True)
    log.info(f"Datos sintéticos generados: {len(df)} filas, y_mean={df['y'].mean():.3f}")
    return df


def train_prophet(df):
    """Entrena modelo Prophet con la serie temporal."""
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=True,
        seasonality_mode="additive",
        changepoint_prior_scale=0.5,
        seasonality_prior_scale=10.0,
        interval_width=0.8,
        growth="flat",
    )

    model.add_seasonality(name="hourly", period=24, fourier_order=10)
    model.add_seasonality(name="peak_hours", period=24, fourier_order=6)

    df_train = df[["ds", "y"]].copy()

    model.fit(df_train)
    log.info("Modelo Prophet entrenado exitosamente")
    return model


def save_model(model, name="prophet_congestion"):
    path = MODELS_DIR / f"{name}.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    log.info(f"Modelo guardado: {path}")


def load_model(name="prophet_congestion"):
    path = MODELS_DIR / f"{name}.pkl"
    if not path.exists():
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def run(hours_back=720):
    log.info(f"Iniciando entrenamiento (ventana: {hours_back}h)...")

    df = build_training_data(hours_back)
    if df.empty:
        log.error("No hay datos para entrenar")
        return

    model = train_prophet(df)
    save_model(model)
    log.info("Entrenamiento completado")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="[TRAIN] %(message)s")
    run()
