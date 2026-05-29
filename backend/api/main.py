import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import auth
from api.routes.v1 import items, extras, predict

from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Medellín Movilidata OS", docs_url="/docs")

FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

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

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")


@app.get("/")
def serve_frontend():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/mapa")
def serve_mapa():
    return FileResponse(str(FRONTEND_DIR / "index.html"))
