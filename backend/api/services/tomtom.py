import os, logging

TOMTOM_KEY = os.getenv("TOMTOM_KEY", "")

log = logging.getLogger("tomtom")

TRAFFIC_TILE_URL = (
    "https://api.tomtom.com/traffic/map/4/tile/flow/{z}/{x}/{y}.png"
    "?key={key}&tileSize=512"
)

INCIDENTS_URL = (
    "https://api.tomtom.com/traffic/services/4/incidentDetails"
    "/s3/{bboxWest}/{bboxSouth}/{bboxEast}/{bboxNorth}.json"
    "?key={key}&projection=EPSG4326&fields={{incidents}}"
)

def traffic_available():
    return bool(TOMTOM_KEY)

def get_tile_url():
    if not TOMTOM_KEY:
        return None
    return TRAFFIC_TILE_URL.format(key=TOMTOM_KEY)

def fetch_traffic_incidents_sync(bbox_west, bbox_south, bbox_east, bbox_north):
    """Versión síncrona (sin asyncio)."""
    if not TOMTOM_KEY:
        return {"incidents": [], "source": "none", "available": False}
    url = INCIDENTS_URL.format(
        bboxWest=bbox_west, bboxSouth=bbox_south,
        bboxEast=bbox_east, bboxNorth=bbox_north, key=TOMTOM_KEY,
    )
    try:
        import httpx
        resp = httpx.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        incidents = []
        for inc in data.get("incidents", []):
            props = inc.get("properties", {})
            p = props.get("geometry", {}).get("point", {}) if isinstance(props.get("geometry"), dict) else {}
            incidents.append({
                "id": inc.get("id"),
                "type": props.get("iconCategory"),
                "description": props.get("description", ""),
                "lat": p.get("lat"),
                "lng": p.get("lng"),
                "severity": props.get("severity", 0),
                "start": props.get("startTime", ""),
                "end": props.get("endTime", ""),
                "from": props.get("from", ""),
                "to": props.get("to", ""),
            })
        return {"incidents": incidents, "source": "tomtom", "available": True}
    except Exception as e:
        log.warning(f"TomTom incidents sync error: {e}")
        return {"incidents": [], "source": "tomtom", "available": True, "error": str(e)}

async def fetch_traffic_incidents(bbox_west, bbox_south, bbox_east, bbox_north):
    if not TOMTOM_KEY:
        return {"incidents": [], "source": "none", "available": False}
    url = INCIDENTS_URL.format(
        bboxWest=bbox_west, bboxSouth=bbox_south,
        bboxEast=bbox_east, bboxNorth=bbox_north, key=TOMTOM_KEY,
    )
    try:
        import httpx
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        incidents = []
        for inc in data.get("incidents", []):
            props = inc.get("properties", {})
            p = props.get("geometry", {}).get("point", {}) if isinstance(props.get("geometry"), dict) else {}
            incidents.append({
                "id": inc.get("id"),
                "type": props.get("iconCategory"),
                "description": props.get("description", ""),
                "lat": p.get("lat"),
                "lng": p.get("lng"),
                "severity": props.get("severity", 0),
                "start": props.get("startTime", ""),
                "end": props.get("endTime", ""),
                "from": props.get("from", ""),
                "to": props.get("to", ""),
            })
        return {"incidents": incidents, "source": "tomtom", "available": True}
    except Exception as e:
        log.warning(f"TomTom incidents error: {e}")
        return {"incidents": [], "source": "tomtom", "available": True, "error": str(e)}
