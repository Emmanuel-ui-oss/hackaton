import math

R_EARTH_KM = 6371


def haversine(lat1, lng1, lat2, lng2):
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    return R_EARTH_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bounding_box(lat, lng, radius_km):
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    return {
        "lat__gte": lat - lat_delta,
        "lat__lte": lat + lat_delta,
        "lng__gte": lng - lng_delta,
        "lng__lte": lng + lng_delta,
    }


def parse_bbox(bbox_str):
    parts = [float(x) for x in bbox_str.split(",")]
    return {
        "lng_min": parts[0],
        "lat_min": parts[1],
        "lng_max": parts[2],
        "lat_max": parts[3],
    }
