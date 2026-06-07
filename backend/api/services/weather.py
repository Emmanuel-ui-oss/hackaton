import logging

import httpx

log = logging.getLogger(__name__)

BASE_URL = "https://api.open-meteo.com/v1/forecast"
MEDELLIN_LAT = 6.2476
MEDELLIN_LNG = -75.5658
TIMEOUT = 10


def fetch_current_weather(lat=MEDELLIN_LAT, lng=MEDELLIN_LNG, timeout=TIMEOUT):
    url = (
        f"{BASE_URL}"
        f"?latitude={lat}&longitude={lng}"
        f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m"
        f"&timezone=America%2FBogota"
    )
    try:
        resp = httpx.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log.debug("Weather fetch error: %s", e)
        return None


def extract_current(data):
    if not data:
        return None
    cur = data.get("current", {})
    return {
        "temp": cur.get("temperature_2m"),
        "humidity": cur.get("relative_humidity_2m"),
        "precipitation": cur.get("precipitation", 0),
        "rain": cur.get("rain", 0),
        "wind": cur.get("wind_speed_10m", 0),
        "weather_code": cur.get("weather_code", 0),
        "time": cur.get("time"),
    }
