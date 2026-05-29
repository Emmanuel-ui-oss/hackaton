import math
from django.utils import timezone
from django.db.models import Q
from apps.core.models import EventoRiesgo, ZonaRiesgo


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

    riesgo_general = "bajo"
    if peligros_cercanos:
        niveles = [p["nivel"] for p in peligros_cercanos]
        if any(n in ("critico",) for n in niveles):
            riesgo_general = "critico"
        elif any(n in ("alto",) for n in niveles):
            riesgo_general = "alto"
        elif any(n in ("medio",) for n in niveles):
            riesgo_general = "medio"

    return {
        "origen": {"lat": origin_lat, "lng": origin_lng},
        "destino": {"lat": dest_lat, "lng": dest_lng},
        "distancia_km": round(dist_total, 2),
        "tiempo_estimado_min": int(tiempo_estimado_min),
        "riesgo_general": riesgo_general,
        "peligros_en_ruta": peligros_cercanos[:10],
    }


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
