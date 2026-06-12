import os, time, logging, io
from urllib.parse import quote
from fastapi import APIRouter
from fastapi.responses import Response
import httpx
import numpy as np
from PIL import Image

router = APIRouter()
log = logging.getLogger("proxies")
MAPTILER_KEY = os.getenv("MAPTILER_KEY", "")

SIATA_RADAR_URL = "https://www.siata.gov.co/operacional/radar/ProdDBZ_AMVA_Radar_10_120.jpeg"
_siata_cache = {"data": None, "ts": 0.0, "ttl": 300}
SIATA_RADAR_BOUNDS = {"north": 7.3, "south": 5.1, "east": -74.3, "west": -76.6}


def _make_transparent(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    w, h = img.size
    img = img.resize((w * 2, h * 2), Image.LANCZOS)
    arr = np.array(img)
    r, g, b, a = arr[:,:,0], arr[:,:,1], arr[:,:,2], arr[:,:,3]
    sat = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
    arr[:,:,3] = np.where(sat < 40, 0, a)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="PNG", optimize=True)
    return buf.getvalue()


@router.get("/proxy/siata/radar")
async def siata_radar():
    global _siata_cache
    now = time.time()
    if _siata_cache["data"] is None or (now - _siata_cache["ts"]) > _siata_cache["ttl"]:
        async with httpx.AsyncClient() as client:
            resp = await client.get(SIATA_RADAR_URL, timeout=30)
            resp.raise_for_status()
            _siata_cache["data"] = _make_transparent(resp.content)
            _siata_cache["ts"] = now
    return Response(content=_siata_cache["data"], media_type="image/png")


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
