import logging
from datetime import datetime
from fastapi import APIRouter, Query
from api.weather import get_coords
from api.cache import make_key, get_cached, set_cached
from api.utils.weather_map import weather_condition
from api.services.weather import fetch_current_weather, extract_current

router = APIRouter()
log = logging.getLogger("weather")

@router.get("/weather")
def get_weather(comuna: str = Query(None, description="Nombre de la comuna")):
    cache_key = make_key("weather", comuna or "_default")
    cached = get_cached(cache_key)
    if cached:
        return cached

    coords = get_coords(comuna)
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={coords['lat']}&longitude={coords['lng']}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
        f"&hourly=temperature_2m,precipitation_probability,precipitation,weather_code"
        f"&timezone=America%2FBogota&forecast_days=2"
    )

    try:
        import httpx
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        cur = data["current"]
        result = {
            "temp": cur["temperature_2m"],
            "condition": weather_condition(cur["weather_code"]),
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
        log.debug(f"Error fetching weather: {e}")
        result = {
            "temp": 23.0, "condition": "Dato no disponible",
            "humidity": 70, "precipitation": 0, "rain": 0,
            "wind": 5, "weather_code": 0,
            "comuna": comuna,
            "updated": datetime.now().isoformat(),
            "hourly": [],
            "_fallback": True,
        }

    set_cached(cache_key, result, 300)
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
            "condition": weather_condition(hourly["weather_code"][i]),
        })
    return result
