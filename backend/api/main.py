import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auth
from api.routes.v1 import items, extras, predict, chat
from api.routes import ws as ws_router
from api.routes import weather as weather_router

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="VisionVial", docs_url="/docs")

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "backend" / "static" / "frontend"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(items.router, prefix="/api/v1", tags=["Items"])
app.include_router(extras.router, prefix="/api/v1", tags=["Extras"])
app.include_router(predict.router, prefix="/api/v1", tags=["Predicción ML"])
app.include_router(weather_router.router, prefix="/api/v1", tags=["Clima"])
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
