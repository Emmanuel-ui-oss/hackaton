import json
import random
import asyncio
from datetime import date
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from jose import jwt, JWTError
from django.conf import settings
from django.contrib.auth import get_user_model
from asgiref.sync import sync_to_async
from apps.core.models import ReporteIncidente, ZonaRiesgo, Alerta

router = APIRouter()
User = get_user_model()

NIVELES = ["CRITICO", "ALTO", "MEDIO", "BAJO"]

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
        base = {}
        count_reporte = sync_to_async(ReporteIncidente.objects.count)
        count_reporte_activos = sync_to_async(lambda: ReporteIncidente.objects.filter(activo=True).count())
        count_zonas = sync_to_async(ZonaRiesgo.objects.count)
        count_alertas = sync_to_async(lambda: Alerta.objects.filter(leida=False).count())
        count_reportes_hoy = sync_to_async(lambda: ReporteIncidente.objects.filter(creado__date=date.today()).count())
        get_zonas = sync_to_async(lambda: list(ZonaRiesgo.objects.all()))

        while self.active:
            try:
                actuals = {
                    "total_reportes": await count_reporte(),
                    "reportes_activos": await count_reporte_activos(),
                    "zonas_riesgo": await count_zonas(),
                    "alertas_no_leidas": await count_alertas(),
                    "reportes_hoy": await count_reportes_hoy(),
                }
                if not base:
                    base = {k: v for k, v in actuals.items()}

                # Stats fluctuando ±4%
                stats = {}
                for k, v in actuals.items():
                    base_v = base.get(k, v)
                    fluctuation = random.uniform(-0.04, 0.04)
                    simulated = max(0, int(base_v * (1 + fluctuation)))
                    stats[k] = simulated
                stats["_actual"] = {k: v for k, v in actuals.items()}

                # Zonas: fluctuar niveles aleatoriamente
                zonas = await get_zonas()
                zonas_updated = []
                zonas_por_nivel = {"CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0}

                for z in zonas:
                    nivel_actual = z.nivel if z.nivel in NIVELES else "BAJO"
                    if random.random() < 0.15:
                        idx = NIVELES.index(nivel_actual)
                        desplazamiento = random.choice([-1, 0, 1])
                        nuevo_idx = max(0, min(3, idx + desplazamiento))
                        nuevo_nivel = NIVELES[nuevo_idx]
                        if nuevo_nivel != nivel_actual:
                            zonas_updated.append({
                                "id": z.id,
                                "nivel_nuevo": nuevo_nivel,
                                "latitud": float(z.latitud),
                                "longitud": float(z.longitud),
                                "radio_metros": z.radio_metros or 500,
                                "nombre": z.nombre,
                                "tipo_riesgo": z.tipo_riesgo,
                            })
                        zonas_por_nivel[nuevo_nivel] += 1
                    else:
                        zonas_por_nivel[nivel_actual] += 1

                stats["zonas_por_nivel"] = zonas_por_nivel
                stats["zonas_updated"] = zonas_updated

                # Reportes por tipo simulados
                stats["reportes_por_tipo"] = {
                    "accidente": max(1, actuals.get("reportes_activos", 10) + random.randint(-2, 2)),
                    "bloqueo": random.randint(2, 8),
                    "robo": random.randint(1, 5),
                }

                # Extras
                stats["eventos_sos"] = max(0, actuals.get("reportes_hoy", 0) // 10 + random.randint(-1, 1))
                stats["lineas_transporte"] = 12
                stats["paradas"] = 140
                stats["favoritos"] = max(1, actuals.get("total_reportes", 100) // 50 + random.randint(-1, 1))

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
        get_user = sync_to_async(lambda: User.objects.filter(id=user_id).first())
        user = await get_user()
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
