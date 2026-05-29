import json
import asyncio
from datetime import date
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from django.conf import settings
from django.contrib.auth import get_user_model
from apps.core.models import ReporteIncidente, ZonaRiesgo, Alerta

router = APIRouter()
User = get_user_model()

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._broadcaster = None

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
        if self._broadcaster is None or self._broadcaster.done():
            self._broadcaster = asyncio.create_task(self._broadcast_stats())

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def _broadcast_stats(self):
        while self.active:
            try:
                today = date.today()
                stats = {
                    "total_reportes": ReporteIncidente.objects.count(),
                    "reportes_activos": ReporteIncidente.objects.filter(activo=True).count(),
                    "zonas_riesgo": ZonaRiesgo.objects.count(),
                    "alertas_no_leidas": Alerta.objects.filter(leida=False).count(),
                    "reportes_hoy": ReporteIncidente.objects.filter(creado__date=today).count(),
                }
                message = json.dumps({"type": "stats", "payload": stats})
                await self._broadcast(message)
            except Exception:
                pass
            await asyncio.sleep(5)

    async def _broadcast(self, message: str):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

manager = ConnectionManager()

@router.websocket("/stats")
async def websocket_stats(websocket: WebSocket, token: str = Query(None)):
    if not token:
        await websocket.close(code=4001)
        return
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = User.objects.filter(id=user_id).first()
        if not user:
            await websocket.close(code=4001)
            return
    except JWTError:
        await websocket.close(code=4001)
        return

    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
