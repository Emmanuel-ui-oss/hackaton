import hashlib, logging
from django.core.cache import cache

log = logging.getLogger("cache")

def make_key(prefix: str, *parts) -> str:
    raw = ":".join(str(p) for p in parts)
    return f"visionvial:{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"

def get_cached(key: str):
    try:
        return cache.get(key)
    except Exception as e:
        log.warning(f"Cache get failed: {e}")
        return None

def set_cached(key: str, value, ttl: int = 300):
    try:
        cache.set(key, value, ttl)
    except Exception as e:
        log.warning(f"Cache set failed: {e}")
