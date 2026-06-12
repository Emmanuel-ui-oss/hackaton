import os, logging
from fastapi import APIRouter, Query
import httpx

router = APIRouter()
log = logging.getLogger("routes")

HERE_API_KEY = os.getenv("HERE_API_KEY", "")
OSRM_BASE = "https://router.project-osrm.org"


OSRM_PROFILES = {
    "car": "driving",
    "moto": "driving",
    "walking": "foot",
}
HERE_TRANSPORT = {
    "car": "car",
    "moto": "car",
    "walking": "pedestrian",
    "transit": "publicTransport",
}


@router.get("/routes")
async def get_routes(
    origin_lat: float = Query(..., alias="olat"),
    origin_lng: float = Query(..., alias="olng"),
    dest_lat: float = Query(..., alias="dlat"),
    dest_lng: float = Query(..., alias="dlng"),
    mode: str = Query("car"),
    alternatives: bool = Query(False),
):
    if mode == "transit" and HERE_API_KEY:
        return await _here_transit(origin_lat, origin_lng, dest_lat, dest_lng)
    if HERE_API_KEY:
        return await _here_routes(origin_lat, origin_lng, dest_lat, dest_lng, mode, alternatives)
    profile = OSRM_PROFILES.get(mode, "driving")
    return await _osrm_routes(origin_lat, origin_lng, dest_lat, dest_lng, profile, alternatives)


async def _here_transit(olat, olng, dlat, dlng):
    url = "https://router.hereapi.com/v8/routes"
    params = {
        "origin": f"{olat},{olng}",
        "destination": f"{dlat},{dlng}",
        "apiKey": HERE_API_KEY,
        "transportMode": "publicTransport",
        "return": "summary,polyline,travelSummary,instructions",
        "lang": "es",
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        routes = []
        for r in data.get("routes", []):
            sections = r.get("sections", [])
            coords = []
            steps = []
            transit_segments = []
            for sec in sections:
                mode_sec = sec.get("mode", {})
                typ = sec.get("type", "")
                if typ == "publicTransport":
                    dep = sec.get("departure", {})
                    arr = sec.get("arrival", {})
                    transport = sec.get("transport", {})
                    transit_segments.append({
                        "type": "metro",
                        "line": transport.get("name", ""),
                        "from": dep.get("name", ""),
                        "to": arr.get("name", ""),
                        "direction": dep.get("stop", {}).get("name", ""),
                        "stops": sec.get("intermediateStops", [{}]) if sec.get("intermediateStops") else 0,
                        "duration_s": sec.get("summary", {}).get("duration", 0) if sec.get("summary") else 0,
                    })
                poly = sec.get("polyline", "")
                if poly:
                    decoded = _decode_here_polyline(poly)
                    coords.extend(decoded)
                for inst in sec.get("instructions", []):
                    steps.append({
                        "distance": inst.get("distance", 0),
                        "nombre": inst.get("streetName", inst.get("text", "")),
                        "tipo": "turn",
                        "modificador": "left" if "left" in inst.get("direction", "").lower() else ("right" if "right" in inst.get("direction", "").lower() else "straight"),
                        "punto": [inst.get("position", {}).get("lng"), inst.get("position", {}).get("lat")],
                    })
            if coords:
                total_dist = r.get("sections", [{}])[0].get("summary", {}).get("length", 0) if r.get("sections") else 0
                total_dur = r.get("sections", [{}])[0].get("summary", {}).get("duration", 0) if r.get("sections") else 0
                routes.append({
                    "distance_m": total_dist,
                    "duration_s": total_dur,
                    "coords": coords,
                    "source": "here_transit",
                    "steps": steps,
                    "segments": transit_segments,
                })
        return {"routes": routes, "source": "here_transit", "waze_url": ""}
    except Exception as e:
        log.warning(f"HERE Transit error: {e}")
        return {"routes": [], "source": "here_transit", "waze_url": "", "error": str(e)}


async def _here_routes(olat, olng, dlat, dlng, mode, alternatives):
    tm = HERE_TRANSPORT.get(mode, "car")
    url = "https://router.hereapi.com/v8/routes"
    params = {
        "origin": f"{olat},{olng}",
        "destination": f"{dlat},{dlng}",
        "apiKey": HERE_API_KEY,
        "transportMode": tm,
        "return": "summary,polyline,travelSummary,instructions",
        "lang": "es",
    }
    if alternatives:
        params["alternatives"] = "2"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        routes = []
        for r in data.get("routes", []):
            sections = r.get("sections", [])
            if not sections:
                continue
            sec = sections[0]
            poly = sec.get("polyline", "")
            summary = sec.get("summary", {})
            coords = _decode_here_polyline(poly) if poly else []
            instructions = sec.get("instructions", [])
            routes.append({
                "distance_m": summary.get("length", 0),
                "duration_s": summary.get("duration", 0),
                "coords": coords,
                "source": "here",
                "steps": [{
                    "distance": inst.get("distance", 0),
                    "nombre": inst.get("streetName", inst.get("text", "")),
                    "tipo": "turn",
                    "modificador": "left" if "left" in inst.get("direction", "").lower() else ("right" if "right" in inst.get("direction", "").lower() else "straight"),
                    "punto": [inst.get("position", {}).get("lng"), inst.get("position", {}).get("lat")]
                } for inst in instructions],
            })
        waze_url = _waze_url(dlat, dlng)
        return {"routes": routes, "source": "here", "waze_url": waze_url}
    except Exception as e:
        log.warning(f"HERE Maps error: {e}")
        return await _osrm_routes(olat, olng, dlat, dlng, OSRM_PROFILES.get(mode, "driving"), alternatives)


def _decode_here_polyline(poly):
    # HERE flexible polyline format — simplified placeholder
    return []


async def _osrm_routes(olat, olng, dlat, dlng, profile, alternatives):
    url = (
        f"{OSRM_BASE}/route/v1/{profile}/"
        f"{olng},{olat};{dlng},{dlat}"
        f"?overview=full&geometries=geojson&steps=true"
    )
    if alternatives:
        url += "&alternatives=2"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        routes = []
        for r in data.get("routes", []):
            coords = r.get("geometry", {}).get("coordinates", [])
            legs = r.get("legs", [])
            routes.append({
                "distance_m": r.get("distance", 0),
                "duration_s": r.get("duration", 0),
                "coords": [[c[1], c[0]] for c in coords],
                "legs": [{"steps": [{
                    "distance": s.get("distance", 0),
                    "name": s.get("name", ""),
                    "maneuver": s.get("maneuver", {}),
                } for s in leg.get("steps", [])]} for leg in legs],
                "source": "osrm",
            })
        waze_url = _waze_url(dlat, dlng)
        return {"routes": routes, "source": "osrm", "waze_url": waze_url}
    except Exception as e:
        log.warning(f"OSRM error: {e}")
        return {"routes": [], "source": "osrm", "waze_url": "", "error": str(e)}


def _waze_url(dlat, dlng):
    return f"https://waze.com/ul?ll={dlat},{dlng}&navigate=yes"
