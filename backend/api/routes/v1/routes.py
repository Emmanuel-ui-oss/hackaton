import os, logging, math, json
from fastapi import APIRouter, Query
import httpx


router = APIRouter()
log = logging.getLogger("routes")

HERE_API_KEY = os.getenv("HERE_API_KEY", "")
OSRM_BASE = "https://router.project-osrm.org"

# Transit assumptions
METRO_SPEED_MS = 12       # ~43 km/h
STOP_DWELL_S = 120        # 2 min per stop
WALK_SPEED_MS = 1.4       # ~5 km/h
MAX_WALK_M = 1500         # max walk to station


@router.get("/routes")
async def get_routes(
    origin_lat: float = Query(..., alias="olat"),
    origin_lng: float = Query(..., alias="olng"),
    dest_lat: float = Query(..., alias="dlat"),
    dest_lng: float = Query(..., alias="dlng"),
    alternatives: bool = Query(False),
    mode: str = Query("car"),
):
    if mode == "walking":
        return await _osrm_routes(origin_lat, origin_lng, dest_lat, dest_lng, alternatives, profile="walking")
    if mode == "transit":
        return await _transit_routes(origin_lat, origin_lng, dest_lat, dest_lng)
    # car/moto → OSRM driving
    if HERE_API_KEY:
        return await _here_routes(origin_lat, origin_lng, dest_lat, dest_lng, alternatives)
    return await _osrm_routes(origin_lat, origin_lng, dest_lat, dest_lng, alternatives, profile="driving")


async def _here_routes(olat, olng, dlat, dlng, alternatives):
    url = "https://router.hereapi.com/v8/routes"
    params = {
        "origin": f"{olat},{olng}",
        "destination": f"{dlat},{dlng}",
        "apiKey": HERE_API_KEY,
        "transportMode": "car",
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
        return await _osrm_routes(olat, olng, dlat, dlng, alternatives, profile="driving")


def _decode_here_polyline(poly):
    # HERE flexible polyline format — simplified: attempts to decode
    # For now return empty; HERE returns GeoJSON or encoded polyline
    return []


async def _osrm_routes(olat, olng, dlat, dlng, alternatives, profile="driving"):
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
                "mode": profile,
            })
        waze_url = _waze_url(dlat, dlng)
        return {"routes": routes, "source": "osrm", "waze_url": waze_url}
    except Exception as e:
        log.warning(f"OSRM error: {e}")
        return {"routes": [], "source": "osrm", "waze_url": "", "error": str(e)}


def _waze_url(dlat, dlng):
    return f"https://waze.com/ul?ll={dlat},{dlng}&navigate=yes"


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _walk_osrm(from_lat, from_lng, to_lat, to_lng):
    url = (f"{OSRM_BASE}/route/v1/walking/"
           f"{from_lng},{from_lat};{to_lng},{to_lat}"
           f"?overview=full&geometries=geojson&steps=false")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        r = data.get("routes", [None])[0]
        if r:
            coords = r.get("geometry", {}).get("coordinates", [])
            return {
                "distance_m": r.get("distance", 0),
                "duration_s": r.get("duration", 0),
                "coords": [[c[1], c[0]] for c in coords],
            }
    except Exception:
        pass
    # fallback: straight-line estimate
    d = _haversine(from_lat, from_lng, to_lat, to_lng)
    return {
        "distance_m": d,
        "duration_s": d / WALK_SPEED_MS,
        "coords": [[from_lat, from_lng], [to_lat, to_lng]],
    }


def _line_paradas_sorted(paradas, linea_id):
    return sorted(
        [p for p in paradas if p.linea_id == linea_id],
        key=lambda p: p.orden
    )


def _segment_between(linea_paradas, from_id, to_id):
    """Return stations list from from_id to to_id in travel direction."""
    fi = next((i for i, p in enumerate(linea_paradas) if p.id == from_id), None)
    ti = next((i for i, p in enumerate(linea_paradas) if p.id == to_id), None)
    if fi is None or ti is None:
        return None
    if fi <= ti:
        return linea_paradas[fi:ti + 1]
    return list(reversed(linea_paradas[ti:fi + 1]))


def _find_route_path(origin_station, dest_station, paradas):
    """
    Find a transit path from origin_station to dest_station.
    Returns list of (line_code, from_station, to_station, stations_list) segments.
    """
    station_to_lines = {}
    for p in paradas:
        station_to_lines.setdefault(p.nombre.lower(), set()).add(p.linea.codigo)

    origin_lp = _line_paradas_sorted(paradas, origin_station.linea_id)
    dest_lp = _line_paradas_sorted(paradas, dest_station.linea_id)

    # 1) Same line → direct
    if origin_station.linea_id == dest_station.linea_id:
        seg = _segment_between(origin_lp, origin_station.id, dest_station.id)
        if seg:
            return [(origin_station.linea.codigo, seg[0], seg[-1], seg)]

    origin_codes = {origin_station.linea.codigo}
    dest_codes = {dest_station.linea.codigo}

    # 2) Station on origin_line is also served by dest_line → 1 transfer
    for p in origin_lp:
        lines_here = station_to_lines.get(p.nombre.lower(), set())
        if lines_here & dest_codes:
            seg1 = _segment_between(origin_lp, origin_station.id, p.id)
            if not seg1:
                continue
            # Now find the same station's stop on dest_line
            dest_same = [sp for sp in dest_lp if sp.nombre.lower() == p.nombre.lower()]
            if dest_same:
                seg2 = _segment_between(dest_lp, dest_same[0].id, dest_station.id)
                if seg2:
                    return [
                        (origin_station.linea.codigo, seg1[0], seg1[-1], seg1),
                        (dest_station.linea.codigo, seg2[0], seg2[-1], seg2),
                    ]

    # 3) Station on origin_line connects to a mid_line, which reaches dest_line → 2 transfers
    best = None
    best_dist = float("inf")
    for p in origin_lp:
        mid_codes = station_to_lines.get(p.nombre.lower(), set()) - origin_codes
        for mid_code in mid_codes:
            try:
                mid_linea_id = next(sp.linea_id for sp in paradas if sp.linea.codigo == mid_code)
            except StopIteration:
                continue
            mid_lp = _line_paradas_sorted(paradas, mid_linea_id)
            for sp in mid_lp:
                if station_to_lines.get(sp.nombre.lower(), set()) & dest_codes:
                    d = _haversine(p.latitud, p.longitud, dest_station.latitud, dest_station.longitud)
                    if d < best_dist:
                        best_dist = d
                        best = (p, mid_code, sp, mid_lp)
    if best:
        xfer_p, mid_code, xfer_sp, mid_lp = best
        seg1 = _segment_between(origin_lp, origin_station.id, xfer_p.id)
        if not seg1:
            return None
        dest_at_sp = [sp for sp in dest_lp if sp.nombre.lower() == xfer_sp.nombre.lower()]
        if not dest_at_sp:
            return None
        seg2 = _segment_between(mid_lp, xfer_p.id, dest_at_sp[0].id)
        if not seg2:
            return None
        return [
            (origin_station.linea.codigo, seg1[0], seg1[-1], seg1),
            (mid_code, seg2[0], seg2[-1], seg2),
        ]

    return None


async def _transit_routes(olat, olng, dlat, dlng):
    from apps.core.models import Parada

    paradas = list(Parada.objects.filter(activo=True).select_related("linea"))
    if not paradas:
        return await _osrm_routes(olat, olng, dlat, dlng, False, profile="walking")

    # Find nearest stations
    origin_station = min(paradas, key=lambda p: _haversine(olat, olng, p.latitud, p.longitud))
    dest_station = min(paradas, key=lambda p: _haversine(dlat, dlng, p.latitud, p.longitud))

    origin_dist = _haversine(olat, olng, origin_station.latitud, origin_station.longitud)
    dest_dist = _haversine(dlat, dlng, dest_station.latitud, dest_station.longitud)

    if origin_dist > MAX_WALK_M or dest_dist > MAX_WALK_M:
        return await _osrm_routes(olat, olng, dlat, dlng, False, profile="walking")

    # Walking segments
    walk_to = await _walk_osrm(olat, olng, origin_station.latitud, origin_station.longitud)
    walk_from = await _walk_osrm(dest_station.latitud, dest_station.longitud, dlat, dlng)

    # Transit route
    path = _find_route_path(origin_station, dest_station, paradas)

    if not path:
        return await _osrm_routes(olat, olng, dlat, dlng, False, profile="walking")

    all_coords = []
    total_dist = 0
    total_duration = 0
    segments = []

    # Walk to station
    if walk_to:
        all_coords.extend(walk_to["coords"])
        total_dist += walk_to["distance_m"]
        total_duration += walk_to["duration_s"]
        segments.append({"type": "walk", "distance_m": walk_to["distance_m"], "duration_s": walk_to["duration_s"]})

    # Metro segments
    for line_code, seg_from, seg_to, station_seg in path:
        dist = sum(
            _haversine(station_seg[i].latitud, station_seg[i].longitud,
                       station_seg[i + 1].latitud, station_seg[i + 1].longitud)
            for i in range(len(station_seg) - 1)
        )
        num_stops = len(station_seg) - 1
        duration = num_stops * STOP_DWELL_S + (dist / METRO_SPEED_MS)

        # Determine direction
        line_paradas = _line_paradas_sorted(paradas, station_seg[0].linea_id)
        primer = line_paradas[0]
        ultimo = line_paradas[-1]
        going_forward = station_seg[0].orden <= station_seg[-1].orden
        direccion = f"{primer.nombre} → {ultimo.nombre}" if going_forward else f"{ultimo.nombre} → {primer.nombre}"

        # Get line geometry
        metro_coords = []
        if station_seg[0].linea.ruta_geojson:
            try:
                gj = json.loads(station_seg[0].linea.ruta_geojson)
                metro_coords = [[c[1], c[0]] for c in gj.get("coordinates", [])]
            except (json.JSONDecodeError, TypeError):
                pass
        if not metro_coords:
            for i in range(len(station_seg) - 1):
                a, b = station_seg[i], station_seg[i + 1]
                metro_coords.append([a.latitud, a.longitud])
                metro_coords.append([(a.latitud + b.latitud) / 2, (a.longitud + b.longitud) / 2])
            metro_coords.append([station_seg[-1].latitud, station_seg[-1].longitud])

        all_coords.extend(metro_coords)
        total_dist += dist
        total_duration += duration
        segments.append({
            "type": "metro",
            "line": line_code,
            "from": seg_from.nombre,
            "to": seg_to.nombre,
            "stops": num_stops,
            "direction": direccion,
            "distance_m": dist,
            "duration_s": duration,
        })

    # Walk from station
    if walk_from:
        all_coords.extend(walk_from["coords"])
        total_dist += walk_from["distance_m"]
        total_duration += walk_from["duration_s"]
        segments.append({"type": "walk", "distance_m": walk_from["distance_m"], "duration_s": walk_from["duration_s"]})

    waze_url = _waze_url(dlat, dlng)
    return {
        "routes": [{
            "distance_m": total_dist,
            "duration_s": total_duration,
            "coords": all_coords,
            "source": "transit",
            "segments": segments,
        }],
        "source": "transit",
        "waze_url": waze_url,
    }
