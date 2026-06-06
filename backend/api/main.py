import os, threading, time, logging

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.conf import settings as django_settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exception_handlers import http_exception_handler as _fastapi_http_handler
from starlette.exceptions import HTTPException as StarletteHTTPException
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from api.limiter import limiter
from api.middleware import SecurityHeadersMiddleware
from api.exception_handlers import global_exception_handler

from api.routes import auth
from api.routes.v1 import items, extras, predict, chat, geocode, traffic, routes, incidents, proxies, paradas
from api.routes import public as public_router
from api.routes import ws as ws_router
from api.routes import weather as weather_router

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

log = logging.getLogger("ingestor")

INGEST_INTERVAL = int(os.getenv("INGEST_INTERVAL", "300"))


def ingestor_loop():
    log.info(f"Ingestor automático iniciado (cada {INGEST_INTERVAL}s)")
    time.sleep(15)
    while True:
        try:
            from scripts.ingest_real_data import run
            run(hours_back=2)
        except Exception as e:
            log.warning(f"Ingesta falló: {e}")
        time.sleep(INGEST_INTERVAL)


t = threading.Thread(target=ingestor_loop, daemon=True)
t.start()

app = FastAPI(title="VisionVial", docs_url="/docs" if django_settings.DEBUG else None, redoc_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(StarletteHTTPException, _fastapi_http_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend" / "static" / "frontend"

# CORS configurable por env DOMAIN + localhost dev
ALLOWED_DOMAINS = os.getenv("DOMAIN", "")
origins = ["http://localhost:5173", "http://localhost:8000", "http://127.0.0.1:8000"]
if ALLOWED_DOMAINS:
    for d in ALLOWED_DOMAINS.split(","):
        d = d.strip()
        origins.append(f"https://{d}")
        origins.append(f"http://{d}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/api/health")
def health():
    from django.db import connection
    db_ok = False
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        pass
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(items.router, prefix="/api/v1", tags=["Items"])
app.include_router(extras.router, prefix="/api/v1", tags=["Extras"])
app.include_router(predict.router, prefix="/api/v1", tags=["Predicción ML"])

app.include_router(geocode.router, prefix="/api/v1", tags=["Geocode"])
app.include_router(traffic.router, prefix="/api/v1", tags=["Tráfico"])
app.include_router(routes.router, prefix="/api/v1", tags=["Rutas"])
app.include_router(incidents.router, prefix="/api/v1", tags=["Incidencias y POI"])
app.include_router(paradas.router, prefix="/api/v1", tags=["Paradas"])
app.include_router(proxies.router, prefix="/api/v1", tags=["Proxies"])
app.include_router(weather_router.router, prefix="/api/v1", tags=["Clima"])
app.include_router(public_router.router, prefix="/api/v1", tags=["Público"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
app.include_router(ws_router.router, prefix="/ws", tags=["WebSocket"])

if FRONTEND_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

    @app.get("/")
    def serve_index():
        return FileResponse(str(FRONTEND_DIR / "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("ws/") or full_path.startswith("docs") or full_path.startswith("assets/") or full_path.startswith("static/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        return FileResponse(str(FRONTEND_DIR / "index.html"), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
