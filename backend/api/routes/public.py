import logging, httpx
from datetime import datetime, timedelta
from fastapi import APIRouter
from apps.core.models import ZonaRiesgo, EventoRiesgo, ReporteIncidente, Testimonial
from api.cache import make_key, get_cached, set_cached

router = APIRouter()
log = logging.getLogger("public")

NIVELES = ["CRITICO", "ALTO", "MEDIO", "BAJO"]

ZONA_NIVEL_PESOS = {"CRITICO": 4, "ALTO": 3, "MEDIO": 2, "BAJO": 1}
EVENTO_NIVEL_PESOS = {"critico": 4, "alto": 3, "medio": 2, "bajo": 1}

WMO_CODES = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado",
    3: "Nublado", 45: "Niebla", 48: "Niebla con escarcha",
    51: "Lluvia ligera", 53: "Lluvia moderada", 55: "Lluvia intensa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia intensa",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada intensa",
    80: "Chubascos ligeros", 81: "Chubascos moderados", 82: "Chubascos intensos",
    95: "Tormenta", 96: "Tormenta con granizo ligero", 99: "Tormenta con granizo intenso",
}


def _fetch_weather():
    try:
        resp = httpx.get(
            "https://api.open-meteo.com/v1/forecast"
            "?latitude=6.2476&longitude=-75.5658"
            "&current=temperature_2m,relative_humidity_2m,weather_code"
            "&timezone=America%2FBogota",
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        cur = data["current"]
        return {
            "temp": cur["temperature_2m"],
            "condition": WMO_CODES.get(cur["weather_code"], "Desconocido"),
            "humidity": cur["relative_humidity_2m"],
        }
    except Exception as e:
        log.warning(f"Error fetching weather in public: {e}")
        return None


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


def _score_a_comuna(comuna: str, zonas_por_comuna: dict, eventos_despues: datetime, hora: int) -> dict:
    score_base = 15
    nivel = "BAJO"

    for z in zonas_por_comuna.get(comuna, []):
        score_base += ZONA_NIVEL_PESOS.get(z.nivel, 1) * 12

    eventos_cerca = EventoRiesgo.objects.filter(
        activo=True, creado__gte=eventos_despues
    )
    for e in eventos_cerca:
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

    testimonios = Testimonial.objects.filter(activo=True)
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

    zonas = ZonaRiesgo.objects.filter(activo=True)
    zonas_json = []
    zonas_por_comuna = {}
    for z in zonas:
        nivel = z.nivel if z.nivel in NIVELES else "BAJO"
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

    zonas_por_nivel = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}
    for z in zonas:
        n = z.nivel if z.nivel in NIVELES else "BAJO"
        zonas_por_nivel[n] += 1

    eventos = EventoRiesgo.objects.filter(
        activo=True, creado__gte=hace_30_meses
    ).order_by("-creado")[:200]

    eventos_json = []
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

    eventos_por_nivel = {"critico": 0, "alto": 0, "medio": 0, "bajo": 0}
    for e in eventos:
        n = e.nivel if e.nivel in eventos_por_nivel else "bajo"
        eventos_por_nivel[n] += 1

    incidentes_hoy = ReporteIncidente.objects.filter(creado__date=ahora.date()).count()
    total_incidentes = ReporteIncidente.objects.filter(activo=True).count()

    comunas_con_score = []
    for c_name in zonas_por_comuna:
        score = _score_a_comuna(c_name, zonas_por_comuna, hace_30_meses, ahora.hour)
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
        "weather": _fetch_weather(),
        "timestamp": ahora.isoformat(),
    }
    set_cached(cache_key, response, 120)
    return response
