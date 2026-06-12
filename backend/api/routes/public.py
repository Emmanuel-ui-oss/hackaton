import logging
from datetime import datetime, timedelta
from fastapi import APIRouter
from apps.core.models import ZonaRiesgo, EventoRiesgo, ReporteIncidente, Testimonial
from api.cache import make_key, get_cached, set_cached
from api.utils.weather_map import weather_condition
from api.services.weather import fetch_current_weather, extract_current

router = APIRouter()
log = logging.getLogger("public")

NIVELES = ["CRITICO", "ALTO", "MEDIO", "BAJO"]

ZONA_NIVEL_PESOS = {"CRITICO": 4, "ALTO": 3, "MEDIO": 2, "BAJO": 1}
EVENTO_NIVEL_PESOS = {"critico": 4, "alto": 3, "medio": 2, "bajo": 1}


def _get_weather():
    data = fetch_current_weather()
    if not data:
        return None
    cur = extract_current(data)
    if not cur:
        return None
    return {
        "temp": cur["temp"],
        "condition": weather_condition(cur["weather_code"]),
        "humidity": cur["humidity"],
    }


def _time_factor(hora: int) -> float:
    if 7 <= hora <= 8:
        return 1.0
    elif hora in (6, 9):
        return 0.8
    elif hora == 12:
        return 0.7
    elif 17 <= hora <= 18:
        return 1.0
    elif hora in (16, 19):
        return 0.8
    elif 10 <= hora <= 15:
        return 0.5
    else:
        return 0.2


def _score_a_comuna(comuna: str, zonas_por_comuna: dict, eventos: list, hora: int) -> dict:
    score_base = 15
    nivel = "BAJO"

    for z in zonas_por_comuna.get(comuna, []):
        score_base += ZONA_NIVEL_PESOS.get(z.nivel, 1) * 12

    for e in eventos:
        score_base += EVENTO_NIVEL_PESOS.get(e.nivel, 1)

    score_base = int(score_base * _time_factor(hora))
    score_base = min(score_base, 98)

    if score_base >= 80:
        nivel = "CRITICO"
    elif score_base >= 60:
        nivel = "ALTO"
    elif score_base >= 35:
        nivel = "MEDIO"

    return {"probabilidad": score_base, "nivel": nivel.lower()}


@router.get("/public/testimonials")
def get_public_testimonials():
    cache_key = make_key("public", "testimonials")
    cached = get_cached(cache_key)
    if cached:
        return cached

    testimonios = list(Testimonial.objects.filter(activo=True))
    result = []
    for t in testimonios:
        result.append({
            "id": t.id,
            "nombre": t.nombre,
            "rol": t.rol,
            "contenido": t.contenido,
            "avatar_url": t.avatar_url or "",
            "calificacion": t.calificacion,
        })
    response = {
        "testimonials": result,
        "total": len(result),
        "promedio": round(
            sum(t.calificacion for t in testimonios) / max(len(result), 1), 1
        ),
    }
    set_cached(cache_key, response, 600)
    return response


@router.get("/public/zonas-riesgo")
def get_public_zonas_riesgo():
    cache_key = make_key("public", "zonas-riesgo")
    cached = get_cached(cache_key)
    if cached:
        return cached

    zonas = ZonaRiesgo.objects.filter(activo=True)
    result = []
    zonas_por_nivel = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}

    for z in zonas:
        nivel = z.nivel if z.nivel in NIVELES else "BAJO"
        zonas_por_nivel[nivel] += 1
        result.append({
            "id": z.id,
            "nombre": z.nombre,
            "comuna": z.comuna,
            "nivel": nivel,
            "tipo_riesgo": z.tipo_riesgo,
            "latitud": float(z.latitud),
            "longitud": float(z.longitud),
            "radio_metros": z.radio_metros or 500,
        })

    response = {
        "zonas": result,
        "zonas_por_nivel": zonas_por_nivel,
        "total": len(result),
    }
    set_cached(cache_key, response, 600)
    return response


@router.get("/public/landing")
def get_public_landing():
    cache_key = make_key("public", "landing")
    cached = get_cached(cache_key)
    if cached:
        return cached

    ahora = datetime.now()
    hace_30_meses = ahora - timedelta(days=30 * 30)

    zonas = list(ZonaRiesgo.objects.filter(activo=True))
    zonas_json = []
    zonas_por_comuna = {}
    zonas_por_nivel = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
    for z in zonas:
        nivel = z.nivel if z.nivel in NIVELES else "BAJO"
        zonas_por_nivel[nivel] += 1
        zonas_json.append({
            "id": z.id,
            "nombre": z.nombre,
            "comuna": z.comuna,
            "nivel": nivel,
            "tipo_riesgo": z.tipo_riesgo,
            "latitud": float(z.latitud),
            "longitud": float(z.longitud),
            "radio_metros": z.radio_metros or 500,
        })
        c = z.comuna or ""
        if c not in zonas_por_comuna:
            zonas_por_comuna[c] = []
        zonas_por_comuna[c].append(z)

    eventos = list(EventoRiesgo.objects.filter(
        activo=True, creado__gte=hace_30_meses
    ).order_by("-creado")[:200])

    eventos_json = []
    eventos_por_nivel = {"critico": 0, "alto": 0, "medio": 0, "bajo": 0}
    for e in eventos:
        eventos_json.append({
            "id": e.id,
            "tipo": e.tipo,
            "nivel": e.nivel,
            "titulo": e.titulo,
            "descripcion": e.descripcion or "",
            "fuente": e.fuente,
            "latitud": float(e.latitud),
            "longitud": float(e.longitud),
            "creado": e.creado.isoformat(),
        })
        n = e.nivel if e.nivel in eventos_por_nivel else "bajo"
        eventos_por_nivel[n] += 1

    incidentes_hoy = ReporteIncidente.objects.filter(creado__date=ahora.date()).count()
    total_incidentes = ReporteIncidente.objects.filter(activo=True).count()

    comunas_con_score = []
    for c_name in zonas_por_comuna:
        score = _score_a_comuna(c_name, zonas_por_comuna, eventos, ahora.hour)
        comunas_con_score.append({
            "comuna": c_name,
            "probabilidad": score["probabilidad"],
            "nivel": score["nivel"],
        })
    comunas_con_score.sort(key=lambda x: x["probabilidad"], reverse=True)

    response = {
        "zonas": zonas_json,
        "zonas_por_nivel": zonas_por_nivel,
        "total_zonas": len(zonas_json),
        "comunas": comunas_con_score,
        "eventos": eventos_json,
        "eventos_por_nivel": eventos_por_nivel,
        "total_eventos": len(eventos_json),
        "incidentes_hoy": incidentes_hoy,
        "total_incidentes": total_incidentes,
        "weather": _get_weather(),
        "timestamp": ahora.isoformat(),
    }
    set_cached(cache_key, response, 30)
    return response
