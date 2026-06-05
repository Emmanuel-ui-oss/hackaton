import math
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q, Count
from apps.core.models import ZonaRiesgo, EventoRiesgo, ReporteIncidente

log = logging.getLogger("ml_zonas")

TIPO_PESOS = {
    "inundacion": 0.25,
    "deslizamiento": 0.30,
    "incendio": 0.20,
    "sismo": 0.15,
    "accidente_vial": 0.20,
    "explosion": 0.35,
    "fuga_gas": 0.20,
    "colapso": 0.30,
    "vendaval": 0.20,
    "otro": 0.10,
}

NIVEL_PESOS = {"critico": 1.0, "alto": 0.7, "medio": 0.4, "bajo": 0.15}

_weather_cache_val = 0.0
_weather_cache_ts = 0.0


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


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
        log.warning(f"Zonas weather fetch error: {e}")
        return _weather_cache_val
    current = data.get("current", {})
    rain = current.get("rain", 0) or current.get("precipitation", 0) or 0
    code = current.get("weather_code", 0)
    if rain > 5 or code in (61, 63, 65, 80, 81, 82):
        _weather_cache_val = 0.15
    elif rain > 1 or code in (51, 53, 55, 56, 57):
        _weather_cache_val = 0.08
    else:
        _weather_cache_val = 0.0
    _weather_cache_ts = now
    return _weather_cache_val


def _eventos_score(lat, lng, radio_km):
    now = timezone.now()
    eventos = EventoRiesgo.objects.filter(
        activo=True
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=now)
    )
    score = 0.0
    for e in eventos:
        d = _haversine(lat, lng, e.latitud, e.longitud)
        if d <= radio_km:
            tipo_w = TIPO_PESOS.get(e.tipo, 0.10)
            nivel_w = NIVEL_PESOS.get(e.nivel, 0.4)
            recency = 1.0
            edad = (now - e.creado).total_seconds()
            if edad > 86400 * 30:
                recency = 0.3
            elif edad > 86400 * 7:
                recency = 0.6
            score += tipo_w * nivel_w * recency
    return min(score, 1.0)


def _reportes_score(lat, lng, radio_km):
    reportes = ReporteIncidente.objects.filter(activo=True)
    score = 0.0
    for r in reportes:
        d = _haversine(lat, lng, r.latitud, r.longitud)
        if d <= radio_km:
            score += 0.12
    return min(score, 0.5)


def compute_risk(zona):
    lat = zona.latitud
    lng = zona.longitud
    radio_km = (zona.radio_metros or 500) / 1000

    eventos = _eventos_score(lat, lng, radio_km)
    reportes = _reportes_score(lat, lng, radio_km)

    try:
        import asyncio
        loop = asyncio.new_event_loop()
        weather = loop.run_until_complete(_weather_factor())
        loop.close()
    except Exception:
        weather = 0.0

    score = eventos + reportes + weather

    if score >= 0.60:
        nivel = "CRITICO"
    elif score >= 0.35:
        nivel = "ALTO"
    elif score >= 0.15:
        nivel = "MEDIO"
    else:
        nivel = "BAJO"

    return nivel, round(score * 100, 1)


def compute_all_zonas():
    zonas = ZonaRiesgo.objects.filter(activo=True).select_related("categoria")
    results = []
    for z in zonas:
        nivel, score = compute_risk(z)
        results.append({
            "id": z.id,
            "nombre": z.nombre,
            "comuna": z.comuna,
            "descripcion": z.descripcion,
            "tipo_riesgo": z.tipo_riesgo,
            "nivel": nivel,
            "nivel_db": z.nivel,
            "score": score,
            "categoria": {"id": z.categoria.id, "nombre": z.categoria.nombre, "nivel": z.categoria.nivel, "color": z.categoria.color} if z.categoria else None,
            "latitud": z.latitud,
            "longitud": z.longitud,
            "radio_metros": z.radio_metros,
            "activo": z.activo,
        })
    return results
