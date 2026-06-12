from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional
from django.db import IntegrityError
from django.db.models import Q
from django.db.models.deletion import ProtectedError

from apps.core.models import CategoriaRiesgo, ZonaRiesgo
from apps.core.audit import log_audit
from api.dependencies import get_current_user

router = APIRouter()


class CategoriaOut(BaseModel):
    id: int
    nombre: str
    nivel: str
    color: str

    class Config:
        from_attributes = True


class ZonaRiesgoOut(BaseModel):
    id: int
    nombre: str
    comuna: str
    descripcion: str
    tipo_riesgo: str
    nivel: str
    categoria: Optional[CategoriaOut] = None
    latitud: float
    longitud: float
    radio_metros: int
    activo: bool

    class Config:
        from_attributes = True


class ZonaRiesgoCreate(BaseModel):
    nombre: str
    comuna: str = ""
    descripcion: str = ""
    tipo_riesgo: str = "OTRO"
    nivel: str = "MEDIO"
    categoria_id: Optional[int] = None
    latitud: float
    longitud: float
    radio_metros: int = 500


class ZonaRiesgoUpdate(BaseModel):
    nombre: Optional[str] = None
    comuna: Optional[str] = None
    descripcion: Optional[str] = None
    tipo_riesgo: Optional[str] = None
    nivel: Optional[str] = None
    categoria_id: Optional[int] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    radio_metros: Optional[int] = None
    activo: Optional[bool] = None


@router.get("/categorias", response_model=list[CategoriaOut])
def list_categorias():
    return list(CategoriaRiesgo.objects.all())


@router.get("/zonas-riesgo")
def list_zonas(
    activo: Optional[bool] = None,
    categoria_id: Optional[int] = None,
    comuna: Optional[str] = None,
    search: Optional[str] = Query(None, min_length=2),
):
    from api.ml.zonas import compute_all_zonas
    results = compute_all_zonas()
    if activo is not None:
        results = [z for z in results if z["activo"] == activo]
    if categoria_id:
        cat_id = int(categoria_id)
        results = [z for z in results if z["categoria"] and z["categoria"]["id"] == cat_id]
    if comuna:
        results = [z for z in results if comuna.lower() in z["comuna"].lower()]
    if search:
        search_lower = search.lower()
        results = [
            z for z in results
            if search_lower in z["nombre"].lower() or search_lower in z["comuna"].lower()
        ]
    return results


@router.get("/zonas-riesgo/{zona_id}")
def get_zona(zona_id: int, user=Depends(get_current_user)):
    z = ZonaRiesgo.objects.select_related("categoria").filter(id=zona_id).first()
    if not z:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return {
        "id": z.id,
        "nombre": z.nombre,
        "comuna": z.comuna,
        "descripcion": z.descripcion,
        "tipo_riesgo": z.tipo_riesgo,
        "nivel": z.nivel,
        "categoria": {"id": z.categoria.id, "nombre": z.categoria.nombre, "nivel": z.categoria.nivel, "color": z.categoria.color} if z.categoria else None,
        "latitud": z.latitud,
        "longitud": z.longitud,
        "radio_metros": z.radio_metros,
        "activo": z.activo,
    }


@router.post("/zonas-riesgo", status_code=status.HTTP_201_CREATED)
def create_zona(data: ZonaRiesgoCreate, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    cat = None
    if data.categoria_id:
        cat = CategoriaRiesgo.objects.filter(id=data.categoria_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
    zona = ZonaRiesgo.objects.create(
        nombre=data.nombre,
        comuna=data.comuna,
        descripcion=data.descripcion,
        tipo_riesgo=data.tipo_riesgo,
        nivel=data.nivel,
        categoria=cat,
        latitud=data.latitud,
        longitud=data.longitud,
        radio_metros=data.radio_metros,
    )
    return {
        "id": zona.id,
        "nombre": zona.nombre,
        "comuna": zona.comuna,
        "descripcion": zona.descripcion,
        "tipo_riesgo": zona.tipo_riesgo,
        "nivel": zona.nivel,
        "categoria": {"id": cat.id, "nombre": cat.nombre, "nivel": cat.nivel, "color": cat.color} if cat else None,
        "latitud": zona.latitud,
        "longitud": zona.longitud,
        "radio_metros": zona.radio_metros,
        "activo": zona.activo,
    }


@router.put("/zonas-riesgo/{zona_id}")
def update_zona(zona_id: int, data: ZonaRiesgoUpdate, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    zona = ZonaRiesgo.objects.filter(id=zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    update_data = data.model_dump(exclude_unset=True)
    if "categoria_id" in update_data:
        if update_data["categoria_id"] is not None:
            cat = CategoriaRiesgo.objects.filter(id=update_data.pop("categoria_id")).first()
            if not cat:
                raise HTTPException(status_code=404, detail="Categoría no encontrada")
            zona.categoria = cat
        else:
            update_data.pop("categoria_id")
            zona.categoria = None
    for field, value in update_data.items():
        setattr(zona, field, value)
    zona.save()
    return {
        "id": zona.id,
        "nombre": zona.nombre,
        "comuna": zona.comuna,
        "descripcion": zona.descripcion,
        "tipo_riesgo": zona.tipo_riesgo,
        "nivel": zona.nivel,
        "categoria": {"id": zona.categoria.id, "nombre": zona.categoria.nombre, "nivel": zona.categoria.nivel, "color": zona.categoria.color} if zona.categoria else None,
        "latitud": zona.latitud,
        "longitud": zona.longitud,
        "radio_metros": zona.radio_metros,
        "activo": zona.activo,
    }


@router.delete("/zonas-riesgo/{zona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zona(zona_id: int, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    try:
        deleted = ZonaRiesgo.objects.filter(id=zona_id).delete()
        if deleted[0] == 0:
            raise HTTPException(status_code=404, detail="Zona no encontrada")
        log_audit(user, "eliminar_zona", "ZonaRiesgo", zona_id, {})
    except ProtectedError:
        raise HTTPException(status_code=409, detail="No se puede eliminar: la zona tiene alertas asociadas")
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Error de integridad al eliminar la zona")
