WEATHER_CACHE = None
WEATHER_CACHE_TIME = 0

MEDELLIN_COORDS = {
    "default": {"lat": 6.2476, "lng": -75.5658},
    "norte": {"lat": 6.2800, "lng": -75.5600},
    "sur": {"lat": 6.2000, "lng": -75.5700},
    "oriente": {"lat": 6.2300, "lng": -75.5300},
    "occidente": {"lat": 6.2500, "lng": -75.6000},
}

COMUNA_MAP = {
    "Comuna 1 - Popular": "norte",
    "Comuna 2 - Santa Cruz": "norte",
    "Comuna 3 - Manrique": "oriente",
    "Comuna 4 - Aranjuez": "norte",
    "Comuna 5 - Castilla": "occidente",
    "Comuna 6 - Doce de Octubre": "occidente",
    "Comuna 7 - Robledo": "occidente",
    "Comuna 8 - Villa Hermosa": "oriente",
    "Comuna 9 - Buenos Aires": "oriente",
    "Comuna 10 - La Candelaria": "default",
    "Comuna 11 - Laureles": "occidente",
    "Comuna 12 - La América": "occidente",
    "Comuna 13 - San Javier": "occidente",
    "Comuna 14 - El Poblado": "sur",
    "Comuna 15 - Guayabal": "sur",
    "Comuna 16 - Belén": "sur",
}


def get_coords(comuna: str = None):
    if comuna and comuna in COMUNA_MAP:
        zone = COMUNA_MAP[comuna]
        return MEDELLIN_COORDS[zone]
    return MEDELLIN_COORDS["default"]
