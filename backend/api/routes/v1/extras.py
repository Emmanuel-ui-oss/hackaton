from fastapi import APIRouter, HTTPException, status, Depends, Query
from django.db import transaction
from django.contrib.auth.models import User
from typing import List, Optional
from datetime import datetime, timedelta

from django.db import models as dmodels

from apps.core.models import (
    ZonaRiesgo, ReporteIncidenteComunitario, VotoReporte,
    Favorito, ContactoEmergencia, EventoSOS,
    LineaTransporte, Parada, HorarioTransporte,
    Alerta, HistorialViaje, Ruta
)
from api.schemas.item import (
    ZonaRiesgoCreate, ZonaRiesgoSchema,
    ReporteComunitarioCreate, ReporteComunitarioSchema,
    VotoCreate, FavoritoCreate, FavoritoSchema,
    ContactoEmergenciaCreate, ContactoEmergenciaSchema,
    EventoSOSSchema, LineaTransporteSchema, ParadaSchema,
    HorarioSchema, AlertaSchema, HistorialViajeSchema, RutaSchema
)
from api.dependencies import get_current_user
from api.pagination import Pagination, paginated_response as paginated

router = APIRouter(prefix="/api/v1", tags=["extras"])


# ──────────────────────────────────────────────
# ZONAS DE RIESGO (RF-01, RF-03, RF-10, RF-11)
# ──────────────────────────────────────────────

@router.get("/zonas-riesgo")
def listar_zonas_riesgo(
    pagination: Pagination = Depends(),
    comuna: Optional[str] = None,
    tipo: Optional[str] = None,
    nivel: Optional[str] = None,
    activa: Optional[bool] = None,
    user: User = Depends(get_current_user)
):
    qs = ZonaRiesgo.objects.all()
    if comuna:
        qs = qs.filter(comuna__icontains=comuna)
    if tipo:
        qs = qs.filter(tipo_riesgo=tipo)
    if nivel:
        qs = qs.filter(nivel=nivel)
    if activa is not None:
        qs = qs.filter(activa=activa)
    items, meta = pagination.apply(qs)
    return paginated(list(items), meta)


@router.post("/zonas-riesgo", response_model=ZonaRiesgoSchema, status_code=201)
def crear_zona_riesgo(data: ZonaRiesgoCreate, user: User = Depends(get_current_user)):
    zona = ZonaRiesgo.objects.create(**data.model_dump())
    return zona


@router.get("/zonas-riesgo/{zona_id}", response_model=ZonaRiesgoSchema)
def obtener_zona_riesgo(zona_id: int, user: User = Depends(get_current_user)):
    try:
        return ZonaRiesgo.objects.get(id=zona_id)
    except ZonaRiesgo.DoesNotExist:
        raise HTTPException(status_code=404, detail="Zona de riesgo no encontrada")


# ──────────────────────────────────────────────
# REPORTES COMUNITARIOS (RF-05, CU-02, RF-18)
# ──────────────────────────────────────────────

@router.get("/reportes")
def listar_reportes(
    pagination: Pagination = Depends(),
    tipo: Optional[str] = None,
    activo: Optional[bool] = None,
    user: User = Depends(get_current_user)
):
    qs = ReporteIncidenteComunitario.objects.select_related("usuario").all()
    if tipo:
        qs = qs.filter(tipo=tipo)
    if activo is not None:
        qs = qs.filter(activo=activo)
    items, meta = pagination.apply(qs)
    result = []
    for r in items:
        result.append(ReporteComunitarioSchema(
            id=r.id, tipo=r.tipo, descripcion=r.descripcion,
            ubicacion_texto=r.ubicacion_texto, latitud=float(r.latitud),
            longitud=float(r.longitud), foto_url=r.foto_url,
            activo=r.activo, votos_positivos=r.votos_positivos,
            votos_negativos=r.votos_negativos,
            usuario_username=r.usuario.username, creado=r.creado
        ))
    return paginated(result, meta)


@router.post("/reportes", response_model=ReporteComunitarioSchema, status_code=201)
def crear_reporte(data: ReporteComunitarioCreate, user: User = Depends(get_current_user)):
    reporte = ReporteIncidenteComunitario.objects.create(
        usuario=user, **data.model_dump()
    )
    return ReporteComunitarioSchema(
        id=reporte.id, tipo=reporte.tipo, descripcion=reporte.descripcion,
        ubicacion_texto=reporte.ubicacion_texto, latitud=float(reporte.latitud),
        longitud=float(reporte.longitud), foto_url=reporte.foto_url,
        activo=reporte.activo, votos_positivos=reporte.votos_positivos,
        votos_negativos=reporte.votos_negativos,
        usuario_username=reporte.usuario.username, creado=reporte.creado
    )


@router.post("/reportes/{reporte_id}/votar", response_model=ReporteComunitarioSchema)
def votar_reporte(reporte_id: int, data: VotoCreate, user: User = Depends(get_current_user)):
    try:
        reporte = ReporteIncidenteComunitario.objects.select_related("usuario").get(id=reporte_id)
    except ReporteIncidenteComunitario.DoesNotExist:
        raise HTTPException(status_code=404, detail="Reporte no encontrado")

    voto, created = VotoReporte.objects.get_or_create(
        usuario=user, reporte=reporte,
        defaults={"positivo": data.positivo}
    )
    if not created:
        if voto.positivo != data.positivo:
            if voto.positivo:
                reporte.votos_positivos = max(0, reporte.votos_positivos - 1)
            else:
                reporte.votos_negativos = max(0, reporte.votos_negativos - 1)
            voto.positivo = data.positivo
            voto.save()
        else:
            raise HTTPException(status_code=400, detail="Ya votaste este reporte")

    if data.positivo:
        reporte.votos_positivos += 1
    else:
        reporte.votos_negativos += 1

    total_votos = reporte.votos_positivos + reporte.votos_negativos
    if total_votos >= 5 and (reporte.votos_negativos / total_votos) > 0.6:
        reporte.activo = False

    reporte.save()

    return ReporteComunitarioSchema(
        id=reporte.id, tipo=reporte.tipo, descripcion=reporte.descripcion,
        ubicacion_texto=reporte.ubicacion_texto, latitud=float(reporte.latitud),
        longitud=float(reporte.longitud), foto_url=reporte.foto_url,
        activo=reporte.activo, votos_positivos=reporte.votos_positivos,
        votos_negativos=reporte.votos_negativos,
        usuario_username=reporte.usuario.username, creado=reporte.creado
    )


# ──────────────────────────────────────────────
# FAVORITOS / DESTINOS FRECUENTES (RF-13)
# ──────────────────────────────────────────────

@router.get("/favoritos")
def listar_favoritos(pagination: Pagination = Depends(), user: User = Depends(get_current_user)):
    qs = Favorito.objects.filter(usuario=user)
    items, meta = pagination.apply(qs)
    return paginated(items, meta)


@router.post("/favoritos", response_model=FavoritoSchema, status_code=201)
def crear_favorito(data: FavoritoCreate, user: User = Depends(get_current_user)):
    fav = Favorito.objects.create(usuario=user, **data.model_dump())
    return fav


@router.delete("/favoritos/{fav_id}", status_code=204)
def eliminar_favorito(fav_id: int, user: User = Depends(get_current_user)):
    try:
        fav = Favorito.objects.get(id=fav_id, usuario=user)
        fav.delete()
    except Favorito.DoesNotExist:
        raise HTTPException(status_code=404, detail="Favorito no encontrado")


# ──────────────────────────────────────────────
# CONTACTOS DE EMERGENCIA (RF-14)
# ──────────────────────────────────────────────

@router.get("/contactos-emergencia")
def listar_contactos(pagination: Pagination = Depends(), user: User = Depends(get_current_user)):
    qs = ContactoEmergencia.objects.filter(usuario=user)
    items, meta = pagination.apply(qs)
    return paginated(items, meta)


@router.post("/contactos-emergencia", response_model=ContactoEmergenciaSchema, status_code=201)
def crear_contacto(data: ContactoEmergenciaCreate, user: User = Depends(get_current_user)):
    c = ContactoEmergencia.objects.create(usuario=user, **data.model_dump())
    return c


@router.delete("/contactos-emergencia/{contacto_id}", status_code=204)
def eliminar_contacto(contacto_id: int, user: User = Depends(get_current_user)):
    try:
        c = ContactoEmergencia.objects.get(id=contacto_id, usuario=user)
        c.delete()
    except ContactoEmergencia.DoesNotExist:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")


# ──────────────────────────────────────────────
# BOTÓN SOS (RF-14, CU-03)
# ──────────────────────────────────────────────

@router.post("/sos/activar", response_model=EventoSOSSchema, status_code=201)
def activar_sos(lat: float = Query(...), lng: float = Query(...), user: User = Depends(get_current_user)):
    contactos = list(ContactoEmergencia.objects.filter(usuario=user).values("nombre", "telefono"))
    evento = EventoSOS.objects.create(
        usuario=user, latitud=lat, longitud=lng,
        contactos_notificados=contactos
    )
    return EventoSOSSchema(
        id=evento.id, latitud=float(evento.latitud),
        longitud=float(evento.longitud), activo=evento.activo,
        contactos_notificados=evento.contactos_notificados,
        timestamp=evento.timestamp
    )


@router.post("/sos/{sos_id}/cerrar")
def cerrar_sos(sos_id: int, user: User = Depends(get_current_user)):
    try:
        evento = EventoSOS.objects.get(id=sos_id, usuario=user, activo=True)
        evento.activo = False
        evento.cerrado = datetime.now()
        evento.save()
        return {"detail": "SOS desactivado"}
    except EventoSOS.DoesNotExist:
        raise HTTPException(status_code=404, detail="Evento SOS no encontrado o ya cerrado")


# ──────────────────────────────────────────────
# LÍNEAS DE TRANSPORTE PÚBLICO (RF-06, RF-16)
# ──────────────────────────────────────────────

@router.get("/lineas-transporte")
def listar_lineas(pagination: Pagination = Depends(), tipo: Optional[str] = None, user: User = Depends(get_current_user)):
    qs = LineaTransporte.objects.all()
    if tipo:
        qs = qs.filter(tipo=tipo)
    items, meta = pagination.apply(qs)
    return paginated(items, meta)


@router.get("/lineas-transporte/{linea_id}/paradas", response_model=List[ParadaSchema])
def listar_paradas(linea_id: int, user: User = Depends(get_current_user)):
    try:
        linea = LineaTransporte.objects.get(id=linea_id)
    except LineaTransporte.DoesNotExist:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    return list(Parada.objects.filter(linea=linea, activa=True).order_by("orden"))


@router.get("/lineas-transporte/{linea_id}/horarios", response_model=List[HorarioSchema])
def listar_horarios(linea_id: int, dia: Optional[int] = None, user: User = Depends(get_current_user)):
    try:
        linea = LineaTransporte.objects.get(id=linea_id)
    except LineaTransporte.DoesNotExist:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    qs = HorarioTransporte.objects.filter(linea=linea)
    if dia is not None:
        qs = qs.filter(dia_semana=dia)
    return list(qs)


# ──────────────────────────────────────────────
# ALERTAS DE RIESGO (RF-08, CU-04)
# ──────────────────────────────────────────────

@router.get("/alertas")
def listar_alertas(pagination: Pagination = Depends(), no_leidas: Optional[bool] = None, user: User = Depends(get_current_user)):
    qs = Alerta.objects.filter(usuario=user).select_related("zona_riesgo")
    if no_leidas:
        qs = qs.filter(leida=False)
    qs = qs.order_by("-creado")
    items, meta = pagination.apply(qs)
    result = []
    for a in items:
        result.append(AlertaSchema(
            id=a.id,
            zona_riesgo=a.zona_riesgo,
            mensaje=a.mensaje,
            nivel=a.nivel,
            leida=a.leida,
            creado=a.creado
        ))
    return paginated(result, meta)


@router.post("/alertas/{alerta_id}/leer")
def marcar_alerta_leida(alerta_id: int, user: User = Depends(get_current_user)):
    try:
        alerta = Alerta.objects.get(id=alerta_id, usuario=user)
        alerta.leida = True
        alerta.save()
        return {"detail": "Alerta marcada como leída"}
    except Alerta.DoesNotExist:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")


# ──────────────────────────────────────────────
# HISTORIAL DE VIAJES (RF-07)
# ──────────────────────────────────────────────

@router.get("/historial-viajes")
def listar_historial(pagination: Pagination = Depends(), user: User = Depends(get_current_user)):
    qs = HistorialViaje.objects.filter(usuario=user).select_related("ruta")
    items, meta = pagination.apply(qs)
    result = []
    for h in items:
        result.append(HistorialViajeSchema(
            id=h.id, origen_nombre=h.origen_nombre,
            destino_nombre=h.destino_nombre,
            distancia_km=float(h.distancia_km) if h.distancia_km else None,
            tiempo_min=h.tiempo_min, ruta=h.ruta,
            costo_estimado=float(h.costo_estimado) if h.costo_estimado else None,
            creado=h.creado
        ))
    return paginated(result, meta)


# ──────────────────────────────────────────────
# BÚSQUEDA GLOBAL (RF-20, RF-25)
# ──────────────────────────────────────────────

@router.get("/search")
def busqueda_global(q: str = Query(min_length=2), user: User = Depends(get_current_user)):
    zonas = list(ZonaRiesgo.objects.filter(
        dmodels.Q(nombre__icontains=q) | dmodels.Q(comuna__icontains=q) | dmodels.Q(descripcion__icontains=q)
    ).values("id", "nombre", "tipo_riesgo", "nivel", "comuna")[:10])

    reportes = list(ReporteIncidenteComunitario.objects.filter(
        dmodels.Q(descripcion__icontains=q) | dmodels.Q(ubicacion_texto__icontains=q)
    ).values("id", "tipo", "descripcion", "activo")[:10])

    rutas = list(Ruta.objects.filter(
        dmodels.Q(origen__icontains=q) | dmodels.Q(destino__icontains=q)
    ).values("id", "origen", "destino", "nivel_riesgo")[:10])

    return {"zonas_riesgo": zonas, "reportes": reportes, "rutas": rutas}


# ──────────────────────────────────────────────
# EXPORT / IMPORT / STATS (Rol 3)
# ──────────────────────────────────────────────

@router.get("/export-csv")
def export_csv(modelo: str = Query(...), user: User = Depends(get_current_user)):
    import csv, io
    modelos = {
        "zonas": ZonaRiesgo,
        "reportes": ReporteIncidenteComunitario,
        "rutas": Ruta,
        "lineas": LineaTransporte,
    }
    if modelo not in modelos:
        raise HTTPException(status_code=400, detail="Modelo no válido")
    qs = modelos[modelo].objects.all()
    if not qs:
        return {"detail": "Sin datos"}
    output = io.StringIO()
    writer = csv.writer(output)
    fields = [f.name for f in qs.model._meta.fields]
    writer.writerow(fields)
    for obj in qs:
        writer.writerow([getattr(obj, f) for f in fields])
    return {"csv": output.getvalue()}


@router.get("/stats")
def stats(user: User = Depends(get_current_user)):
    from django.db.models import Count
    return {
        "zonas_riesgo": ZonaRiesgo.objects.count(),
        "zonas_por_nivel": dict(ZonaRiesgo.objects.values_list("nivel").annotate(total=Count("id"))),
        "reportes_comunitarios": ReporteIncidenteComunitario.objects.count(),
        "reportes_activos": ReporteIncidenteComunitario.objects.filter(activo=True).count(),
        "lineas_transporte": LineaTransporte.objects.count(),
        "paradas": Parada.objects.count(),
        "alertas_enviadas": Alerta.objects.count(),
        "eventos_sos": EventoSOS.objects.count(),
        "rutas": Ruta.objects.count(),
        "favoritos": Favorito.objects.count(),
    }
