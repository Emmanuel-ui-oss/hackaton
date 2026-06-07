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

    if result.get("suggestions"):
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
        f"https://photon.komoot.io/api/"
        f"?q={quote(q)}&limit={limit}&lat=6.2476&lon=-75.5658"
    )
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers={"User-Agent": "VisionVial/1.0"}, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        suggestions = []
        for f in data.get("features", []):
            props = f.get("properties", {})
            coords = f.get("geometry", {}).get("coordinates", [])
            if len(coords) < 2: continue
            nombre = props.get("name", "")
            street = props.get("street", "")
            ciudad = props.get("city", props.get("district", ""))
            if nombre and street:
                label = f"{nombre}, {street}, {ciudad}" if ciudad else f"{nombre}, {street}"
            elif street:
                label = f"{street}, {ciudad}" if ciudad else street
            elif nombre:
                label = f"{nombre}, {ciudad}" if ciudad else nombre
            else:
                label = props.get("osm_value", props.get("type", ""))
            suggestions.append({
                "label": label,
                "lat": float(coords[1]),
                "lng": float(coords[0]),
                "type": props.get("type", "address"),
            })
        return {"suggestions": suggestions, "source": "photon"}
    except Exception as e:
        log.warning(f"Photon error: {e}")
        return {"suggestions": [], "source": "photon"}
