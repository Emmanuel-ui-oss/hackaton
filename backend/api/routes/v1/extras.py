import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from django.db.models import Count, Q
from fastapi.responses import StreamingResponse

from apps.core.models import ReporteIncidente, ZonaRiesgo, EventoRiesgo
from api.dependencies import get_current_user
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)

router = APIRouter()


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


@router.get("/items/stats")
def get_stats(user=Depends(get_current_user)):
    total_reportes = ReporteIncidente.objects.count()
    reportes_hoy = ReporteIncidente.objects.filter(
        creado__date=datetime.now().date()
    ).count()

    por_tipo = (
        ReporteIncidente.objects.values("tipo")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    por_estado = (
        ReporteIncidente.objects.values("estado")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    ultimos = (
        ReporteIncidente.objects.select_related("usuario")
        .order_by("-creado")[:5]
    )
    ultimos_data = [
        {
            "id": r.id,
            "tipo": r.tipo,
            "usuario": r.usuario.username,
            "creado": r.creado.isoformat(),
        }
        for r in ultimos
    ]

    total_zonas = ZonaRiesgo.objects.count()
    zonas_activas = ZonaRiesgo.objects.filter(activo=True).count()

    return {
        "total_reportes": total_reportes,
        "reportes_hoy": reportes_hoy,
        "por_tipo": list(por_tipo),
        "por_estado": list(por_estado),
        "ultimos": ultimos_data,
        "total_zonas": total_zonas,
        "zonas_activas": zonas_activas,
    }


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


@router.get("/search")
def search_items(
    q: str = Query(..., min_length=2),
    tipo: str = None,
    estado: str = None,
    user=Depends(get_current_user),
):
    qs = ReporteIncidente.objects.select_related("usuario").all()
    qs = qs.filter(
        Q(descripcion__icontains=q) | Q(ubicacion__icontains=q)
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

    return {"results": results, "total": len(results)}


@router.post("/reportes", status_code=201)
def crear_reporte(
    tipo: str = "otro",
    descripcion: str = "",
    ubicacion: str = "",
    latitud: float = 0,
    longitud: float = 0,
    user=Depends(get_current_user),
):
    reporte = ReporteIncidente.objects.create(
        tipo=tipo,
        descripcion=descripcion,
        ubicacion=ubicacion or f"{latitud},{longitud}",
        latitud=latitud,
        longitud=longitud,
        usuario=user,
        estado="pendiente",
    )
    return {
        "id": reporte.id,
        "tipo": reporte.tipo,
        "mensaje": "Reporte creado correctamente",
    }


@router.get("/eventos/near")
def eventos_cercanos(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radio_km: float = Query(5.0, ge=0.1, le=100),
    fuente: str = None,
    nivel: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    from django.db.models import Q
    import math

    qs = EventoRiesgo.objects.filter(
        activo=True,
    ).filter(
        Q(expira_en__isnull=True) | Q(expira_en__gte=datetime.now())
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
