import time, logging
from datetime import datetime
from fastapi import APIRouter, Query
import httpx
from api.weather import get_coords

router = APIRouter()
log = logging.getLogger("weather")

CACHE = {}
CACHE_TTL = 300

WMO_CODES = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado",
    3: "Nublado", 45: "Niebla", 48: "Niebla con escarcha",
    51: "Lluvia ligera", 53: "Lluvia moderada", 55: "Lluvia intensa",
    56: "Lluvia helada ligera", 57: "Lluvia helada intensa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia intensa",
    66: "Lluvia helada ligera", 67: "Lluvia helada intensa",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada intensa",
    80: "Chubascos ligeros", 81: "Chubascos moderados", 82: "Chubascos intensos",
    95: "Tormenta", 96: "Tormenta con granizo ligero", 99: "Tormenta con granizo intenso",
}


@router.get("/weather")
def get_weather(comuna: str = Query(None, description="Nombre de la comuna")):
    cache_key = comuna or "_default"
    now = time.time()

    if cache_key in CACHE and (now - CACHE[cache_key]["ts"]) < CACHE_TTL:
        return CACHE[cache_key]["data"]

    coords = get_coords(comuna)
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={coords['lat']}&longitude={coords['lng']}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
        f"&hourly=temperature_2m,precipitation_probability,precipitation,weather_code"
        f"&timezone=America%2FBogota&forecast_days=2"
    )

    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        cur = data["current"]
        result = {
            "temp": cur["temperature_2m"],
            "condition": WMO_CODES.get(cur["weather_code"], "Desconocido"),
            "humidity": cur["relative_humidity_2m"],
            "precipitation": cur["precipitation"],
            "rain": cur["rain"],
            "wind": cur.get("wind_speed_10m", 0),
            "weather_code": cur["weather_code"],
            "comuna": comuna,
            "updated": cur["time"],
            "hourly": _build_hourly(data["hourly"]),
        }
    except Exception as e:
        log.warning(f"Error fetching weather: {e}")
        result = {
            "temp": 23.0, "condition": "Dato no disponible",
            "humidity": 70, "precipitation": 0, "rain": 0,
            "wind": 5, "weather_code": 0,
            "comuna": comuna,
            "updated": datetime.now().isoformat(),
            "hourly": [],
            "_fallback": True,
        }

    CACHE[cache_key] = {"data": result, "ts": now}
    return result


def _build_hourly(hourly: dict) -> list:
    result = []
    for i in range(len(hourly["time"])):
        result.append({
            "time": hourly["time"][i],
            "temp": hourly["temperature_2m"][i],
            "rain_prob": hourly["precipitation_probability"][i],
            "precipitation": hourly["precipitation"][i],
            "weather_code": hourly["weather_code"][i],
            "condition": WMO_CODES.get(hourly["weather_code"][i], ""),
        })
    return result
