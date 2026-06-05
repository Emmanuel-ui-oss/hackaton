import asyncio
import math
import logging
from django.utils import timezone
from django.db.models import Q
from apps.core.models import EventoRiesgo, ZonaRiesgo

log = logging.getLogger("ml_routes")


_weather_cache_val = 0.0
_weather_cache_ts = 0.0


async def _weather_risk():
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
    except Exception:
        return _weather_cache_val
    current = data.get("current", {})
    rain = current.get("rain", 0) or current.get("precipitation", 0) or 0
    code = current.get("weather_code", 0)
    if rain > 5 or code in (61, 63, 65, 80, 81, 82):
        _weather_cache_val = 0.2
    elif rain > 1 or code in (51, 53, 55, 56, 57):
        _weather_cache_val = 0.1
    else:
        _weather_cache_val = 0.0
    _weather_cache_ts = now
    return _weather_cache_val


def safe_route(origin_lat, origin_lng, dest_lat, dest_lng):
    eventos = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=timezone.now())
    )
    zonas = ZonaRiesgo.objects.filter(activo=True)

    peligros = []
    for evento in eventos:
        dist = _haversine(origin_lat, origin_lng, evento.latitud, evento.longitud)
        if dist <= (evento.radio_impacto_metros or 500) / 1000:
            peligros.append({
                "tipo": evento.tipo, "nivel": evento.nivel,
                "titulo": evento.titulo,
                "distancia_km": round(dist, 2),
                "lat": evento.latitud, "lng": evento.longitud,
            })
    for zona in zonas:
        dist = _haversine(origin_lat, origin_lng, zona.latitud, zona.longitud)
        if dist <= (zona.radio_metros or 500) / 1000:
            peligros.append({
                "tipo": zona.tipo_riesgo, "nivel": zona.nivel,
                "titulo": f"Zona: {zona.nombre}",
                "distancia_km": round(dist, 2),
                "lat": zona.latitud, "lng": zona.longitud,
            })

    dist_total = _haversine(origin_lat, origin_lng, dest_lat, dest_lng)
    tiempo_base = dist_total / 40 * 60

    try:
        loop = asyncio.new_event_loop()
        weather_r = loop.run_until_complete(_weather_risk())
        loop.close()
    except Exception:
        weather_r = 0.0

    hora = timezone.now().hour
    hora_factor = 1.0
    if 7 <= hora <= 9 or 17 <= hora <= 19:
        hora_factor = 1.3
    elif 22 <= hora or hora <= 5:
        hora_factor = 0.7

    # Congestion profile for destination area
    try:
        from api.ml.congestion import predict_congestion
        cong = predict_congestion(lat=dest_lat, lng=dest_lng)
        congestion_pct = cong.get("probabilidad", 0) / 100
    except Exception:
        congestion_pct = 0.0
    congestion_factor = 1.0 + congestion_pct * 0.3

    from api.services.tomtom import traffic_available
    traffic_factor = 1.1 if traffic_available() and (7 <= hora <= 9 or 17 <= hora <= 19) else 1.0

    tiempo_estimado = int(tiempo_base * hora_factor * traffic_factor * congestion_factor)

    niveles = [p["nivel"] for p in peligros]
    riesgo = "bajo"
    if any(n == "critico" for n in niveles): riesgo = "critico"
    elif any(n == "alto" for n in niveles): riesgo = "alto"
    elif any(n == "medio" for n in niveles): riesgo = "medio"
    if weather_r >= 0.15 and riesgo == "bajo": riesgo = "medio"

    return {
        "origen": {"lat": origin_lat, "lng": origin_lng},
        "destino": {"lat": dest_lat, "lng": dest_lng},
        "distancia_km": round(dist_total, 2),
        "tiempo_estimado_min": tiempo_estimado,
        "riesgo_general": riesgo,
        "peligros_en_ruta": peligros[:10],
        "factors": {
            "hora_pico": hora_factor > 1,
            "trafico": traffic_factor > 1,
            "clima_adverso": weather_r >= 0.1,
        },
    }


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
