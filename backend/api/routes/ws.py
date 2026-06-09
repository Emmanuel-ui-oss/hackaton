import json
import asyncio
from datetime import date, datetime
from collections import defaultdict
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import jwt, JWTError
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Count
from asgiref.sync import sync_to_async
from apps.core.models import ReporteIncidente, ZonaRiesgo, Alerta, EventoSOS

router = APIRouter()
User = get_user_model()

MAX_CONNECTIONS_PER_IP = 5
ip_connections = defaultdict(int)


class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
        self._broadcaster = None

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def _broadcast_stats(self):
        while self.active:
            try:
                total_reportes = await sync_to_async(ReporteIncidente.objects.count)()
                reportes_activos = await sync_to_async(lambda: ReporteIncidente.objects.filter(activo=True).count())()
                zonas_riesgo = await sync_to_async(ZonaRiesgo.objects.count)()
                alertas_no_leidas = await sync_to_async(lambda: Alerta.objects.filter(leida=False).count())()
                reportes_hoy = await sync_to_async(lambda: ReporteIncidente.objects.filter(creado__date=date.today()).count())()

                zonas_nivel_data = await sync_to_async(
                    lambda: list(ZonaRiesgo.objects.values("nivel").annotate(total=Count("id")))
                )()
                zonas_por_nivel = {z["nivel"]: z["total"] for z in zonas_nivel_data}

                reportes_tipo_data = await sync_to_async(
                    lambda: list(ReporteIncidente.objects.values("tipo").annotate(total=Count("id")))
                )()
                reportes_por_tipo = {r["tipo"].lower(): r["total"] for r in reportes_tipo_data}

                get_sos_activos = sync_to_async(lambda: list(
                    EventoSOS.objects.filter(activo=True).select_related(
                        "usuario", "usuario__perfil"
                    ).values(
                        "id", "latitud", "longitud", "creado",
                        "usuario__username",
                        "usuario__email",
                        "usuario__first_name",
                        "usuario__last_name",
                        "usuario__perfil__telefono",
                    )
                ))
                sos_raw = await get_sos_activos()
                sos_activos = [
                    {
                        "id": s["id"],
                        "latitud": float(s["latitud"]),
                        "longitud": float(s["longitud"]),
                        "username": s["usuario__username"],
                        "nombre_completo": (f"{s['usuario__first_name']} {s['usuario__last_name']}".strip()
                                            or s["usuario__username"]),
                        "email": s["usuario__email"] or "",
                        "telefono": s["usuario__perfil__telefono"] or "",
                        "creado": s["creado"].isoformat() if hasattr(s["creado"], "isoformat") else str(s["creado"]),
                    }
                    for s in sos_raw
                ]

                payload = {
                    "total_reportes": total_reportes,
                    "reportes_activos": reportes_activos,
                    "zonas_riesgo": zonas_riesgo,
                    "alertas_no_leidas": alertas_no_leidas,
                    "reportes_hoy": reportes_hoy,
                    "zonas_por_nivel": zonas_por_nivel,
                    "reportes_por_tipo": reportes_por_tipo,
                    "sos_activos": sos_activos,
                }

                message = json.dumps({"type": "stats", "payload": payload})
                await self._broadcast(message)
            except Exception:
                pass
            await asyncio.sleep(3)

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
async def websocket_stats(websocket: WebSocket):
    client_ip = websocket.client.host if websocket.client else "unknown"
    if ip_connections[client_ip] >= MAX_CONNECTIONS_PER_IP:
        await websocket.close(code=4003, reason="Demasiadas conexiones")
        return

    await websocket.accept()
    ip_connections[client_ip] += 1
    authed = False

    try:
        for _ in range(50):  # 10s timeout (50 * 0.2s)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.2)
                msg = json.loads(data)
                if msg.get("type") == "auth" and msg.get("token"):
                    payload = jwt.decode(msg["token"], settings.SECRET_KEY, algorithms=["HS256"])
                    user_id = payload.get("user_id")
                    get_user = sync_to_async(lambda: User.objects.filter(id=user_id).first())
                    user = await get_user()
                    if user:
                        authed = True
                        break
            except asyncio.TimeoutError:
                continue
            except (json.JSONDecodeError, JWTError):
                continue

        if not authed:
            await websocket.close(code=4001)
            return

        manager.active.append(websocket)
        if manager._broadcaster is None or manager._broadcaster.done():
            manager._broadcaster = asyncio.create_task(manager._broadcast_stats())

        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)
        ip_connections[client_ip] = max(0, ip_connections[client_ip] - 1)
