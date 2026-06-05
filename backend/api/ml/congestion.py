import math
import asyncio
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count
from apps.core.models import ReporteIncidente, EventoRiesgo, ZonaRiesgo

log = logging.getLogger("ml_congestion")

DIAS_ES = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

# Group scaling factors (relative congestion intensity per group)
GROUP_SCALE = {
    "alta": 1.0,
    "media": 0.80,
    "baja": 0.55,
    "especial": 0.65,
}

# Map each comuna to its group
COMUNA_GROUPS = {
    "Comuna 10 - La Candelaria": "alta",
    "Comuna 14 - El Poblado": "alta",
    "Comuna 11 - Laureles": "alta",
    "Comuna 15 - Guayabal": "media",
    "Comuna 16 - Belén": "media",
    "Comuna 5 - Castilla": "media",
    "Comuna 4 - Aranjuez": "media",
    "Comuna 1 - Popular": "baja",
    "Comuna 2 - Santa Cruz": "baja",
    "Comuna 3 - Manrique": "baja",
    "Comuna 8 - Villa Hermosa": "baja",
    "Comuna 9 - Buenos Aires": "baja",
    "Comuna 12 - La América": "baja",
    "Comuna 7 - Robledo": "especial",
    "Comuna 13 - San Javier": "especial",
    "Comuna 6 - Doce de Octubre": "especial",
}

DEFAULT_GROUP = "media"

_weather_cache_val = 0.0
_weather_cache_ts = 0.0
_zonas_cache = None
_zonas_cache_ts = 0.0
_profiles_cache = None
_profiles_cache_ts = 0.0


def _build_profiles_from_db():
    global _profiles_cache, _profiles_cache_ts
    now = timezone.now()
    if _profiles_cache is not None and (now.timestamp() - _profiles_cache_ts) < 3600:
        return _profiles_cache
    raw_counts = [0] * 24
    eventos = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=now)
    )
    for e in eventos:
        hour = e.creado.hour
        raw_counts[hour] += 1
    max_count = max(raw_counts) if max(raw_counts) > 0 else 1
    base_profile = [round(c / max_count, 4) for c in raw_counts]
    max_val = max(base_profile)
    if max_val > 0:
        base_profile = [round(v / max_val, 4) for v in base_profile]
    base_profile = [max(v, 0.02) for v in base_profile]
    if max(raw_counts) == 0:
        base_profile = [0.05, 0.04, 0.04, 0.04, 0.06, 0.10, 0.20, 0.35, 0.40, 0.35, 0.25, 0.22, 0.25, 0.24, 0.22, 0.20, 0.25, 0.35, 0.45, 0.40, 0.25, 0.18, 0.10, 0.05]
    profiles = {}
    for group, scale in GROUP_SCALE.items():
        profiles[group] = [round(min(v * scale, 0.92), 4) for v in base_profile]
    _profiles_cache = profiles
    _profiles_cache_ts = now.timestamp()
    log.info(f"Built congestion profiles from {sum(raw_counts)} events: max={max_count}, shape={base_profile}")
    return profiles


def _get_nivel(prob):
    if prob >= 0.80: return "critico"
    if prob >= 0.60: return "alto"
    if prob >= 0.35: return "medio"
    return "bajo"


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _find_nearest_comuna(lat, lng):
    global _zonas_cache, _zonas_cache_ts
    now = timezone.now().timestamp()
    if _zonas_cache is None or (now - _zonas_cache_ts) > 60:
        _zonas_cache = list(ZonaRiesgo.objects.filter(activo=True).values(
            "nombre", "nivel", "comuna", "latitud", "longitud", "radio_metros"
        ))
        _zonas_cache_ts = now
    best = None
    best_dist = float("inf")
    for z in _zonas_cache:
        d = _haversine(lat, lng, z["latitud"], z["longitud"])
        if d < best_dist:
            best_dist = d
            best = z
    return best


def _group_for_comuna(nombre):
    return COMUNA_GROUPS.get(nombre, DEFAULT_GROUP)


def _profile_for_comuna(nombre):
    profiles = _build_profiles_from_db()
    return profiles.get(_group_for_comuna(nombre), profiles[DEFAULT_GROUP])


async def _weather_factor():
    global _weather_cache_val, _weather_cache_ts
    now = timezone.now().timestamp()
    if _weather_cache_val != 0.0 and (now - _weather_cache_ts) < 300:
        return _weather_cache_val
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.open-meteo.com/v1/forecast?"
                "latitude=6.2442&longitude=-75.5812"
                "&current=precipitation,rain,weather_code"
                "&timezone=auto",
                timeout=8,
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        log.warning(f"Weather fetch error: {e}")
        return _weather_cache_val
    current = data.get("current", {})
    rain = current.get("rain", 0) or current.get("precipitation", 0) or 0
    code = current.get("weather_code", 0)
    if rain > 5 or code in (61, 63, 65, 80, 81, 82):
        _weather_cache_val = 0.12
    elif rain > 1 or code in (51, 53, 55, 56, 57):
        _weather_cache_val = 0.06
    else:
        _weather_cache_val = 0.0
    _weather_cache_ts = now
    return _weather_cache_val


def _db_event_factor(lat, lng, radio_km=1.0):
    now = timezone.now()
    eventos = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=now)
    )
    count = 0
    seen = 0
    for e in eventos:
        d = _haversine(lat, lng, e.latitud, e.longitud)
        if d <= radio_km:
            count += 1
            if count > 30:
                break
    if count <= 3:
        return 0.0
    return min(0.10, count * 0.01)


def _db_report_factor(lat, lng, radio_km=1.0):
    reportes = ReporteIncidente.objects.filter(activo=True)
    count = 0
    for r in reportes:
        d = _haversine(lat, lng, r.latitud, r.longitud)
        if d <= radio_km:
            count += 1
    if count == 0:
        return 0.0
    return min(0.06, count * 0.02)


def predict_congestion(lat=None, lng=None, comuna=None, hora=None, dia_semana=None):
    now = timezone.now()
    if hora is None: hora = now.hour
    if dia_semana is None: dia_semana = now.weekday()
    hora = max(0, min(23, hora))

    nearest = None
    if lat is not None and lng is not None:
        nearest = _find_nearest_comuna(lat, lng)
    elif comuna:
        nearest = ZonaRiesgo.objects.filter(nombre__icontains=comuna.replace("Comuna ", "")).first()
        if not nearest:
            nearest = ZonaRiesgo.objects.filter(nombre__icontains=comuna).first()

    profile = _build_profiles_from_db()[DEFAULT_GROUP]
    nivel_zona = None
    comuna_nombre = comuna
    comuna_lat = lat or 6.2442
    comuna_lng = lng or -75.5812

    if nearest:
        comuna_nombre = nearest.get("nombre") if isinstance(nearest, dict) else nearest.nombre
        profile = _profile_for_comuna(comuna_nombre)
        nivel_zona = nearest.get("nivel") if isinstance(nearest, dict) else nearest.nivel
        if isinstance(nearest, dict):
            comuna_lat = nearest["latitud"]
            comuna_lng = nearest["longitud"]
        else:
            comuna_lat = nearest.latitud
            comuna_lng = nearest.longitud

    # Base from 24h profile
    base = profile[hora]

    # Weekend adjustment (lower traffic sat/sun)
    if dia_semana >= 5:
        base *= 0.75

    adjustments = 0.0

    # Zone risk level bonus
    if nivel_zona:
        if nivel_zona in ("CRITICO", "critico"):
            adjustments += 0.08
        elif nivel_zona in ("ALTO", "alto"):
            adjustments += 0.04

    # DB events nearby
    adjustments += _db_event_factor(comuna_lat, comuna_lng)

    # DB reports nearby
    adjustments += _db_report_factor(comuna_lat, comuna_lng)

    # Weather
    try:
        loop = asyncio.new_event_loop()
        weather_w = loop.run_until_complete(_weather_factor())
        loop.close()
    except Exception:
        weather_w = 0.0
    adjustments += weather_w

    # Traffic (TomTom available → small bump in peak hours)
    if 7 <= hora <= 9 or 17 <= hora <= 19:
        try:
            from api.services.tomtom import traffic_available
            if traffic_available():
                adjustments += 0.06
        except Exception:
            pass

    prob = min(0.92, max(0.03, base + adjustments))
    nivel = _get_nivel(prob)
    dia_nombre = DIAS_ES[dia_semana] if 0 <= dia_semana <= 6 else "lunes"

    return {
        "probabilidad": round(prob * 100, 1),
        "nivel": nivel,
        "hora": hora,
        "dia": dia_nombre,
        "comuna": comuna_nombre,
        "features": {
            "perfil_hora": round(base * 100, 1),
            "nivel_zona": round(adjustments * 0 if nivel_zona else 0, 1),
            "eventos_db": round(_db_event_factor(comuna_lat, comuna_lng) * 100, 1),
            "reportes_db": round(_db_report_factor(comuna_lat, comuna_lng) * 100, 1),
            "clima": round(weather_w * 100, 1),
        },
    }


def get_hourly_forecast(lat=None, lng=None, comuna=None):
    now = timezone.now()
    dia_semana = now.weekday()
    current_hour = now.hour
    predictions = []
    for h in range(24):
        pred = predict_congestion(
            lat=lat, lng=lng, comuna=comuna,
            hora=(current_hour + h) % 24,
            dia_semana=dia_semana if current_hour + h < 24 else (dia_semana + 1) % 7,
        )
        pred["hora_label"] = f"{(current_hour + h) % 24:02d}:00"
        predictions.append(pred)
    return predictions
