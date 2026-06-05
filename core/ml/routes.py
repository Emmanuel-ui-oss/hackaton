import math, pickle, logging
from datetime import datetime, timedelta
from pathlib import Path
from django.db.models import Q
from apps.core.models import EventoRiesgo, ZonaRiesgo
from django.utils import timezone

log = logging.getLogger("ml.routes")

_prophet_model = None
_MODEL_PATH = Path(__file__).resolve().parent / "models" / "prophet_congestion.pkl"
TZ = timezone.get_current_timezone()

NIVEL_SCORE = {"bajo": 0.2, "medio": 0.5, "alto": 0.8, "critico": 1.0}


def _load_prophet():
    global _prophet_model
    if _prophet_model is not None:
        return _prophet_model
    if not _MODEL_PATH.exists():
        return None
    try:
        with open(_MODEL_PATH, "rb") as f:
            _prophet_model = pickle.load(f)
    except Exception:
        _prophet_model = None
    return _prophet_model


def _congestion_risk_at(hora=None, weekday=None) -> float:
    """Retorna riesgo de congestión [0-1] para la hora actual usando Prophet."""
    model = _load_prophet()
    if model is None:
        return 0.5
    try:
        now = timezone.now()
        h = hora if hora is not None else now.hour
        dw = weekday if weekday is not None else now.weekday()
        days_ahead = (dw - now.weekday()) % 7
        target = now.replace(hour=h, minute=0, second=0, microsecond=0)
        target += timedelta(days=days_ahead)
        target_naive = target.astimezone(TZ).replace(tzinfo=None)

        import pandas as pd
        future = pd.DataFrame({"ds": [target_naive]})
        forecast = model.predict(future)
        return max(0.0, min(1.0, float(forecast["yhat"].iloc[0])))
    except Exception as e:
        log.warning(f"Error Prophet en ruta: {e}")
        return 0.5


def _sample_route_points(lat1, lng1, lat2, lng2, n=5):
    """Muestrea puntos intermedios a lo largo de la ruta."""
    points = []
    for i in range(n + 1):
        frac = i / n
        lat = lat1 + (lat2 - lat1) * frac
        lng = lng1 + (lng2 - lng1) * frac
        points.append((lat, lng))
    return points


def _incident_density(points, radius_km=1.0):
    """Calcula densidad de incidentes alrededor de puntos de ruta, con peso temporal."""
    now = timezone.now()
    total_score = 0.0
    count = 0
    for lat, lng in points:
        eventos = EventoRiesgo.objects.filter(
            activo=True,
        ).filter(
            Q(expira_en__isnull=True) | Q(expira_en__gte=now)
        )
        for e in eventos:
            dist = _haversine(lat, lng, e.latitud, e.longitud)
            if dist <= radius_km:
                peso_tiempo = max(0.3, 1.0 - (now - e.creado).total_seconds() / (86400 * 7))
                nivel_score = NIVEL_SCORE.get(e.nivel, 0.5)
                total_score += peso_tiempo * nivel_score
                count += 1

    if count == 0:
        return 0.0
    return min(1.0, total_score / max(count, 1))


def safe_route(origin_lat: float, origin_lng: float,
               dest_lat: float, dest_lng: float) -> dict:
    eventos_activos = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=timezone.now())
    )
    zonas = ZonaRiesgo.objects.filter(activo=True)

    peligros_cercanos = []
    for evento in eventos_activos:
        dist = _haversine(origin_lat, origin_lng, evento.latitud, evento.longitud)
        if dist <= evento.radio_impacto_metros / 1000:
            peligros_cercanos.append({
                "tipo": evento.tipo,
                "nivel": evento.nivel,
                "titulo": evento.titulo,
                "distancia_km": round(dist, 2),
                "lat": evento.latitud,
                "lng": evento.longitud,
            })

    for zona in zonas:
        dist = _haversine(origin_lat, origin_lng, zona.latitud, zona.longitud)
        if dist <= zona.radio_metros / 1000:
            peligros_cercanos.append({
                "tipo": zona.tipo_riesgo,
                "nivel": zona.nivel,
                "titulo": f"Zona: {zona.nombre}",
                "distancia_km": round(dist, 2),
                "lat": zona.latitud,
                "lng": zona.longitud,
            })

    dist_total = _haversine(origin_lat, origin_lng, dest_lat, dest_lng)
    tiempo_estimado_min = dist_total / 40 * 60

    route_points = _sample_route_points(origin_lat, origin_lng, dest_lat, dest_lng)
    density_score = _incident_density(route_points, radius_km=1.0)
    congestion_score = _congestion_risk_at()

    riesgo_ml = 0.4 * density_score + 0.6 * congestion_score

    riesgo_general = "bajo"
    riesgo_puntaje = riesgo_ml
    if peligros_cercanos:
        niveles = [p["nivel"] for p in peligros_cercanos]
        if any(n in ("critico",) for n in niveles):
            riesgo_puntaje = max(riesgo_puntaje, 0.9)
            riesgo_general = "critico"
        elif any(n in ("alto",) for n in niveles):
            riesgo_puntaje = max(riesgo_puntaje, 0.7)
            riesgo_general = "alto"
        elif any(n in ("medio",) for n in niveles):
            riesgo_puntaje = max(riesgo_puntaje, 0.5)
            riesgo_general = "medio"

    if riesgo_general == "bajo":
        if riesgo_puntaje >= 0.8:
            riesgo_general = "critico"
        elif riesgo_puntaje >= 0.6:
            riesgo_general = "alto"
        elif riesgo_puntaje >= 0.35:
            riesgo_general = "medio"

    return {
        "origen": {"lat": origin_lat, "lng": origin_lng},
        "destino": {"lat": dest_lat, "lng": dest_lng},
        "distancia_km": round(dist_total, 2),
        "tiempo_estimado_min": int(tiempo_estimado_min),
        "riesgo_general": riesgo_general,
        "riesgo_puntaje": round(riesgo_puntaje, 2),
        "modelo": "prophet+dbscan",
        "peligros_en_ruta": peligros_cercanos[:10],
    }


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
