import os
import sys
import django
import socket
import logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes.auth import router as auth_router
from api.routes.v1.items import router as items_router
from api.routes.v1.extras import router as extras_router
from api.exception_handlers import global_exception_handler, http_exception_handler, validation_exception_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from config.env import env

# ── Logging ──
LOG_LEVEL = env("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)
logger = logging.getLogger("transporte_riesgos")


def get_ips():
    ips = []
    hostname = socket.gethostname()
    try:
        for info in socket.getaddrinfo(hostname, None):
            addr = info[4][0]
            if addr and not addr.startswith("127.") and ":" not in addr:
                if addr not in ips:
                    ips.append(addr)
    except Exception:
        pass
    ips.sort()
    port = int(env("SERVER_PORT", "8000"))
    return {"hostname": hostname, "ips": ips, "port": port}

logger.info("Inicializando aplicación Transporte y Riesgos v2.0.0")
app = FastAPI(title="Transporte y Riesgos API - Medellín", version="2.0.0")

# ── Exception handlers ──
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

app.include_router(auth_router)
app.include_router(items_router)
app.include_router(extras_router)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "Transporte y Riesgos"}


@app.get("/api/info")
def info():
    from django.conf import settings
    return {
        "app": "Transporte y Riesgos - Medellin",
        "version": "2.0.0",
        "database": settings.DATABASES["default"]["ENGINE"].split(".")[-1],
        "database_name": settings.DATABASES["default"]["NAME"],
        "mode": "offline-capable",
        "network": get_ips(),
        "endpoints": {
            "auth": ["register", "login", "me"],
            "v1": ["items", "zonas-riesgo", "reportes", "lineas-transporte",
                   "alertas", "favoritos", "contactos-emergencia", "sos",
                   "historial-viajes", "search", "stats", "export-csv"]
        }
    }


@app.get("/")
def index():
    from fastapi.responses import FileResponse
    idx = STATIC_DIR / "index.html"
    if idx.exists():
        return FileResponse(str(idx))
    return {"detail": "Bienvenido a Transporte y Riesgos API - Sirve contenido estatico en /static/"}
