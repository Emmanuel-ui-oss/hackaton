import csv
import io
import json
import math
import socket

from datetime import datetime, date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from django.db.models import Count, Q
from django.utils import timezone
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from apps.core.models import (
    ReporteIncidente, ZonaRiesgo, EventoRiesgo, CategoriaRiesgo,
    Alerta, LineaTransporte, Parada, HorarioTransporte,
    Favorito, ContactoEmergencia, EventoSOS, HistorialViaje, VotoReporte,
)
from api.dependencies import get_current_user
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)

router = APIRouter()


# ── REPORTES ──

class ReporteOut(BaseModel):
    id: int
    tipo: str
    descripcion: str
    ubicacion_texto: str
    latitud: float
    longitud: float
    usuario_username: str
    activo: bool
    votos_positivos: int
    votos_negativos: int
    creado: str

    class Config:
        from_attributes = True


@router.get("/reportes")
def list_reportes(
    tipo: str = None,
    activo: bool = None,
    user=Depends(get_current_user),
):
    qs = ReporteIncidente.objects.select_related("usuario").all()
    if tipo:
        qs = qs.filter(tipo=tipo)
    if activo is not None:
        qs = qs.filter(activo=activo)
    return [
        {
            "id": r.id,
            "tipo": r.tipo,
            "descripcion": r.descripcion,
            "ubicacion_texto": r.ubicacion_texto or r.ubicacion,
            "latitud": r.latitud,
            "longitud": r.longitud,
            "usuario_username": r.usuario.username,
            "activo": r.activo,
            "votos_positivos": r.votos_positivos,
            "votos_negativos": r.votos_negativos,
            "creado": r.creado.isoformat(),
        }
        for r in qs
    ]


class ReporteCreate(BaseModel):
    tipo: str = "otro"
    descripcion: str = ""
    ubicacion: str = ""
    ubicacion_texto: str = ""
    latitud: float = 0
    longitud: float = 0


@router.post("/reportes", status_code=201)
def crear_reporte(data: ReporteCreate, user=Depends(get_current_user)):
    reporte = ReporteIncidente.objects.create(
        tipo=data.tipo,
        descripcion=data.descripcion,
        ubicacion=data.ubicacion or f"{data.latitud},{data.longitud}",
        ubicacion_texto=data.ubicacion_texto or data.ubicacion,
        latitud=data.latitud,
        longitud=data.longitud,
        usuario=user,
        estado="pendiente",
        activo=True,
    )
    return {
        "id": reporte.id,
        "tipo": reporte.tipo,
        "descripcion": reporte.descripcion,
        "ubicacion_texto": reporte.ubicacion_texto,
        "latitud": reporte.latitud,
        "longitud": reporte.longitud,
        "usuario_username": user.username,
        "activo": True,
        "votos_positivos": 0,
        "votos_negativos": 0,
        "creado": reporte.creado.isoformat(),
    }


@router.post("/reportes/{reporte_id}/votar")
def votar_reporte(reporte_id: int, data: dict, user=Depends(get_current_user)):
    reporte = ReporteIncidente.objects.filter(id=reporte_id).first()
    if not reporte:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")
    positivo = data.get("positivo", True)
    voto, created = VotoReporte.objects.get_or_create(
        usuario=user, reporte=reporte,
        defaults={"positivo": positivo, "voto": "positivo" if positivo else "negativo"},
    )
    if not created:
        if voto.positivo == positivo:
            raise HTTPException(status_code=400, detail="Ya votaste este reporte")
        if voto.positivo:
            reporte.votos_positivos = max(0, reporte.votos_positivos - 1)
        else:
            reporte.votos_negativos = max(0, reporte.votos_negativos - 1)
        voto.positivo = positivo
        voto.voto = "positivo" if positivo else "negativo"
        voto.save()
    if positivo:
        reporte.votos_positivos += 1
    else:
        reporte.votos_negativos += 1
    reporte.save()
    return {
        "id": reporte.id,
        "votos_positivos": reporte.votos_positivos,
        "votos_negativos": reporte.votos_negativos,
    }


# ── FAVORITOS ──

class FavoritoCreate(BaseModel):
    nombre: str
    direccion: str = ""
    latitud: float
    longitud: float


@router.get("/favoritos")
def list_favoritos(user=Depends(get_current_user)):
    qs = Favorito.objects.filter(usuario=user)
    return [
        {"id": f.id, "nombre": f.nombre, "direccion": f.direccion,
         "latitud": f.latitud, "longitud": f.longitud, "creado": f.creado.isoformat()}
        for f in qs
    ]


@router.post("/favoritos", status_code=201)
def crear_favorito(data: FavoritoCreate, user=Depends(get_current_user)):
    fav = Favorito.objects.create(
        usuario=user, nombre=data.nombre,
        direccion=data.direccion, latitud=data.latitud, longitud=data.longitud,
    )
    return {"id": fav.id, "nombre": fav.nombre, "direccion": fav.direccion,
            "latitud": fav.latitud, "longitud": fav.longitud}


@router.delete("/favoritos/{fav_id}", status_code=204)
def eliminar_favorito(fav_id: int, user=Depends(get_current_user)):
    fav = Favorito.objects.filter(id=fav_id, usuario=user).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")
    fav.delete()


# ── CONTACTOS DE EMERGENCIA ──

class ContactoCreate(BaseModel):
    nombre: str
    telefono: str
    email: str = ""


@router.get("/contactos-emergencia")
def list_contactos(user=Depends(get_current_user)):
    qs = ContactoEmergencia.objects.filter(usuario=user, activo=True)
    return [
        {"id": c.id, "nombre": c.nombre, "telefono": c.telefono,
         "email": c.email, "relacion": c.relacion}
        for c in qs
    ]


@router.post("/contactos-emergencia", status_code=201)
def crear_contacto(data: ContactoCreate, user=Depends(get_current_user)):
    c = ContactoEmergencia.objects.create(
        usuario=user, nombre=data.nombre,
        telefono=data.telefono, email=data.email,
    )
    return {"id": c.id, "nombre": c.nombre, "telefono": c.telefono, "email": c.email}


@router.delete("/contactos-emergencia/{contacto_id}", status_code=204)
def eliminar_contacto(contacto_id: int, user=Depends(get_current_user)):
    c = ContactoEmergencia.objects.filter(id=contacto_id, usuario=user).first()
    if not c:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    c.activo = False
    c.save()


# ── SOS ──

@router.post("/sos/activar", status_code=201)
def activar_sos(lat: float = Query(...), lng: float = Query(...), user=Depends(get_current_user)):
    contactos = ContactoEmergencia.objects.filter(usuario=user, activo=True)
    sos = EventoSOS.objects.create(
        usuario=user, latitud=lat, longitud=lng,
        activo=True,
        contactos_notificados=[
            {"nombre": c.nombre, "telefono": c.telefono}
            for c in contactos
        ],
    )
    return {"id": sos.id, "activo": True, "contactos_notificados": sos.contactos_notificados}


@router.post("/sos/{sos_id}/cerrar")
def cerrar_sos(sos_id: int, user=Depends(get_current_user)):
    sos = EventoSOS.objects.filter(id=sos_id, usuario=user).first()
    if not sos:
        raise HTTPException(status_code=404, detail="Evento SOS no encontrado")
    sos.activo = False
    sos.save()
    return {"id": sos.id, "activo": False}


# ── LÍNEAS DE TRANSPORTE ──

@router.get("/lineas-transporte")
def list_lineas(tipo: str = None):
    qs = LineaTransporte.objects.filter(activo=True)
    if tipo:
        qs = qs.filter(tipo=tipo)
    return [
        {"id": l.id, "nombre": l.nombre, "tipo": l.tipo,
         "codigo": l.codigo, "color": l.color, "descripcion": l.descripcion}
        for l in qs
    ]


@router.get("/lineas-transporte/{linea_id}/paradas")
def list_paradas(linea_id: int):
    linea = LineaTransporte.objects.filter(id=linea_id, activo=True).first()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    qs = Parada.objects.filter(linea=linea, activo=True).order_by("orden")
    return [
        {"id": p.id, "nombre": p.nombre, "direccion": p.direccion,
         "latitud": p.latitud, "longitud": p.longitud, "orden": p.orden}
        for p in qs
    ]


@router.get("/lineas-transporte/{linea_id}/horarios")
def list_horarios(linea_id: int, dia: int = None):
    linea = LineaTransporte.objects.filter(id=linea_id, activo=True).first()
    if not linea:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    qs = HorarioTransporte.objects.filter(linea=linea)
    if dia:
        qs = qs.filter(dia_semana=dia)
    return [
        {"id": h.id, "dia_semana": h.dia_semana,
         "hora_inicio": h.hora_inicio.strftime("%H:%M"),
         "hora_fin": h.hora_fin.strftime("%H:%M"),
         "frecuencia_min": h.frecuencia_min}
        for h in qs
    ]


# ── ALERTAS ──

@router.get("/alertas")
def list_alertas(no_leidas: bool = False, user=Depends(get_current_user)):
    qs = Alerta.objects.filter(usuario=user).select_related("zona_riesgo")
    if no_leidas:
        qs = qs.filter(leida=False)
    return [
        {
            "id": a.id,
            "mensaje": a.mensaje,
            "nivel": a.nivel,
            "leida": a.leida,
            "creado": a.creado.isoformat(),
            "zona_riesgo": {
                "id": a.zona_riesgo.id,
                "nombre": a.zona_riesgo.nombre,
                "nivel": a.zona_riesgo.nivel,
                "comuna": a.zona_riesgo.comuna,
                "latitud": a.zona_riesgo.latitud,
                "longitud": a.zona_riesgo.longitud,
            } if a.zona_riesgo else None,
        }
        for a in qs
    ]


@router.post("/alertas/{alerta_id}/leer")
def leer_alerta(alerta_id: int, user=Depends(get_current_user)):
    alerta = Alerta.objects.filter(id=alerta_id, usuario=user).first()
    if not alerta:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    alerta.leida = True
    alerta.save()
    return {"id": alerta.id, "leida": True}


# ── HISTORIAL DE VIAJES ──

@router.get("/historial-viajes")
def list_historial(user=Depends(get_current_user)):
    qs = HistorialViaje.objects.filter(usuario=user).order_by("-creado")
    return [
        {
            "id": h.id,
            "origen_nombre": h.origen_nombre,
            "destino_nombre": h.destino_nombre,
            "origen_lat": h.origen_lat,
            "origen_lng": h.origen_lng,
            "destino_lat": h.destino_lat,
            "destino_lng": h.destino_lng,
            "distancia_km": h.distancia_km,
            "tiempo_min": h.tiempo_min,
            "costo_estimado": h.costo_estimado,
            "creado": h.creado.isoformat(),
        }
        for h in qs
    ]


# ── STATS (versión unificada) ──

@router.get("/items/stats")
@router.get("/stats")
def get_stats(user=Depends(get_current_user)):
    now = timezone.now()
    total_reportes = ReporteIncidente.objects.count()
    reportes_hoy = ReporteIncidente.objects.filter(creado__date=now.date()).count()

    por_tipo = list(
        ReporteIncidente.objects.values("tipo")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    por_estado = list(
        ReporteIncidente.objects.values("estado")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    ultimos = [
        {
            "id": r.id, "tipo": r.tipo,
            "usuario": r.usuario.username,
            "creado": r.creado.isoformat(),
        }
        for r in ReporteIncidente.objects.select_related("usuario").order_by("-creado")[:5]
    ]

    total_zonas = ZonaRiesgo.objects.count()
    zonas_activas = ZonaRiesgo.objects.filter(activo=True).count()
    zonas_por_nivel = {}
    for z in ZonaRiesgo.objects.values("nivel").annotate(total=Count("id")):
        zonas_por_nivel[z["nivel"]] = z["total"]

    total_eventos = EventoRiesgo.objects.count()
    eventos_activos = EventoRiesgo.objects.filter(activo=True).count()
    eventos_por_tipo = list(
        EventoRiesgo.objects.values("tipo").annotate(total=Count("id")).order_by("-total")
    )

    alertas_no_leidas = Alerta.objects.filter(leida=False).count()
    total_alertas = Alerta.objects.count()

    lineas_transporte = LineaTransporte.objects.count()
    paradas = Parada.objects.count()
    favoritos = Favorito.objects.filter(usuario=user).count()
    eventos_sos = EventoSOS.objects.filter(usuario=user).count()

    return {
        "total_reportes": total_reportes,
        "reportes_hoy": reportes_hoy,
        "por_tipo": por_tipo,
        "por_estado": por_estado,
        "ultimos": ultimos,
        "zonas_riesgo": total_zonas,
        "reportes_activos": ReporteIncidente.objects.filter(activo=True).count(),
        "lineas_transporte": lineas_transporte,
        "paradas": paradas,
        "alertas_enviadas": total_alertas,
        "eventos_sos": eventos_sos,
        "favoritos": favoritos,
        "zonas_por_nivel": zonas_por_nivel,
        "reportes_por_tipo": {r["tipo"]: r["count"] for r in por_tipo},
    }


# ── SEARCH ──

@router.get("/search")
def search_items(
    q: str = Query(..., min_length=2),
    tipo: str = None,
    estado: str = None,
    user=Depends(get_current_user),
):
    qs = ReporteIncidente.objects.select_related("usuario").all()
    qs = qs.filter(
        Q(descripcion__icontains=q) | Q(ubicacion__icontains=q) | Q(ubicacion_texto__icontains=q)
    )
    if tipo:
        qs = qs.filter(tipo=tipo)
    if estado:
        qs = qs.filter(estado=estado)

    results = [
        {
            "id": r.id,
            "tipo": r.tipo,
            "descripcion": r.descripcion[:100],
            "ubicacion": r.ubicacion,
            "usuario": r.usuario.username,
            "estado": r.estado,
            "creado": r.creado.isoformat(),
        }
        for r in qs[:50]
    ]

    zonas = ZonaRiesgo.objects.filter(
        Q(nombre__icontains=q) | Q(comuna__icontains=q) | Q(descripcion__icontains=q)
    )[:10]
    zonas_data = [
        {"id": z.id, "nombre": z.nombre, "nivel": z.nivel,
         "tipo_riesgo": z.tipo_riesgo, "comuna": z.comuna}
        for z in zonas
    ]

    return {"results": results, "total": len(results), "zonas_riesgo": zonas_data, "reportes": results, "rutas": []}


# ── NETWORK INFO ──

@router.get("/info")
def get_info(user=Depends(get_current_user)):
    hostname = socket.gethostname()
    ips = set()
    try:
        for info in socket.getaddrinfo(hostname, None):
            addr = info[4][0]
            if addr and not addr.startswith("127."):
                ips.add(addr)
    except Exception:
        pass
    return {
        "network": {
            "hostname": hostname,
            "ips": list(ips) or ["127.0.0.1"],
            "port": 8000,
        }
    }


# ── EVENTOS / NEAR ──

@router.get("/eventos/near")
def eventos_cercanos(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radio_km: float = Query(5.0, ge=0.1, le=100),
    fuente: str = None,
    nivel: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    qs = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=timezone.now())
    )

    if fuente:
        qs = qs.filter(fuente=fuente)
    if nivel:
        qs = qs.filter(nivel=nivel)

    eventos = []
    for e in qs:
        dlat = math.radians(e.latitud - lat)
        dlng = math.radians(e.longitud - lng)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat)) * math.cos(math.radians(e.latitud)) * math.sin(dlng / 2) ** 2
        dist_km = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        if dist_km <= radio_km:
            eventos.append({
                "id": e.id,
                "tipo": e.tipo,
                "nivel": e.nivel,
                "fuente": e.fuente,
                "titulo": e.titulo,
                "descripcion": e.descripcion,
                "latitud": e.latitud,
                "longitud": e.longitud,
                "radio_impacto_metros": e.radio_impacto_metros,
                "distancia_km": round(dist_km, 2),
                "expira_en": e.expira_en.isoformat() if e.expira_en else None,
                "creado": e.creado.isoformat(),
            })

    return {"eventos": eventos, "total": len(eventos), "centro": {"lat": lat, "lng": lng, "radio_km": radio_km}}


# ── EXPORT / IMPORT / UPLOAD ──

@router.get("/items/export/csv")
def export_csv(user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")

    reportes = ReporteIncidente.objects.select_related("usuario").all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Tipo", "Descripción", "Ubicación", "Latitud", "Longitud", "Usuario", "Estado", "Creado"])

    for r in reportes:
        writer.writerow([r.id, r.tipo, r.descripcion, r.ubicacion, r.latitud, r.longitud, r.usuario.username, r.estado, r.creado.isoformat()])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=reportes.csv"},
    )


@router.post("/items/import")
def import_items(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")

    content = file.file.read().decode("utf-8")
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON inválido")

    if not isinstance(data, list):
        raise HTTPException(status_code=400, detail="Debe ser un array de objetos")

    creados = 0
    errores = []
    for i, item in enumerate(data):
        try:
            ReporteIncidente.objects.create(
                tipo=item.get("tipo", "otro"),
                descripcion=item.get("descripcion", ""),
                ubicacion=item.get("ubicacion", ""),
                latitud=item.get("latitud", 0),
                longitud=item.get("longitud", 0),
                usuario=user,
                estado="pendiente",
            )
            creados += 1
        except Exception as e:
            errores.append({"index": i, "error": str(e)})

    return {"creados": creados, "errores": errores}


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
    import aiofiles
    from pathlib import Path

    upload_dir = Path("media/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / file.filename
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    return {
        "filename": file.filename,
        "size": len(content),
        "url": f"/media/uploads/{file.filename}",
    }
