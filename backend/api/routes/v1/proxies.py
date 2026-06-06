import os, logging
from urllib.parse import quote
from fastapi import APIRouter
import httpx

router = APIRouter()
log = logging.getLogger("proxies")
MAPTILER_KEY = os.getenv("MAPTILER_KEY", "")

RAINVIEWER_MANIFEST = "https://api.rainviewer.com/public/weather-maps.json"


@router.get("/proxy/rainviewer/manifest")
async def rainviewer_manifest():
    async with httpx.AsyncClient() as client:
        resp = await client.get(RAINVIEWER_MANIFEST, timeout=15)
        resp.raise_for_status()
        return resp.json()


@router.get("/proxy/geocode")
async def proxy_geocode(q: str, limit: int = 10):
    if not MAPTILER_KEY:
        return {"features": []}
    url = (
        f"https://api.maptiler.com/geocoding/{quote(q)}.json"
        f"?key={MAPTILER_KEY}&language=es&country=co&limit={limit}"
    )
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    features = [
        {"label": f["place_name"], "lat": f["center"][1], "lng": f["center"][0]}
        for f in data.get("features", [])
    ]
    return {"features": features}


@router.get("/proxy/reverse-geocode")
async def proxy_reverse_geocode(lat: float, lng: float):
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json&accept-language=es"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, timeout=10, headers={"User-Agent": "VisionVial/1.0"})
        if resp.status_code != 200:
            return {"road": None}
        data = resp.json()
        road = (
            data.get("address", {}).get("road")
            or data.get("address", {}).get("street")
            or data.get("address", {}).get("pedestrian")
            or data.get("address", {}).get("path")
            or data.get("address", {}).get("cycleway")
            or (data.get("display_name", "").split(",")[0] if data.get("display_name") else None)
        )
        return {"road": road}
