import os, logging, time
from urllib.parse import quote
from fastapi import APIRouter, Query
import httpx

router = APIRouter()
log = logging.getLogger("geocode")

CACHE = {}
CACHE_TTL = 600

GEOAPIFY_KEY = os.getenv("GEOAPIFY_API_KEY", "")


@router.get("/geocode/autocomplete")
async def autocomplete(q: str = Query(..., min_length=2), limit: int = Query(5, ge=1, le=10)):
    cache_key = f"{q}:{limit}"
    now = time.time()

    if cache_key in CACHE and (now - CACHE[cache_key]["ts"]) < CACHE_TTL:
        return CACHE[cache_key]["data"]

    if GEOAPIFY_KEY:
        result = await _geoapify(q, limit)
    else:
        result = await _nominatim(q, limit)

    CACHE[cache_key] = {"data": result, "ts": now}
    return result


async def _geoapify(q: str, limit: int) -> dict:
    url = (
        f"https://api.geoapify.com/v1/geocode/autocomplete"
        f"?text={quote(q)}&limit={limit}&bias=proximity:6.2476,-75.5658"
        f"&filter=countrycode:co&apiKey={GEOAPIFY_KEY}"
    )
    try:
        resp = await httpx.AsyncClient().get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", [])
        suggestions = []
        for f in features:
            props = f.get("properties", {})
            suggestions.append({
                "label": props.get("formatted", ""),
                "lat": props.get("lat"),
                "lng": props.get("lon"),
                "type": props.get("result_type", "unknown"),
            })
        return {"suggestions": suggestions, "source": "geoapify"}
    except Exception as e:
        log.warning(f"Geoapify error: {e}")
        return await _nominatim(q, limit)


async def _nominatim(q: str, limit: int) -> dict:
    url = (
        f"https://nominatim.openstreetmap.org/search"
        f"?q={quote(q)}%2C+Medell%C3%ADn%2C+Colombia"
        f"&format=json&limit={limit}&accept-language=es"
    )
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "VisionVial/1.0"}, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        suggestions = [
            {
                "label": item.get("display_name", ""),
                "lat": float(item["lat"]),
                "lng": float(item["lon"]),
                "type": "address",
            }
            for item in data
        ]
        return {"suggestions": suggestions, "source": "nominatim"}
    except Exception as e:
        log.warning(f"Nominatim error: {e}")
        return {"suggestions": [], "source": "nominatim"}
