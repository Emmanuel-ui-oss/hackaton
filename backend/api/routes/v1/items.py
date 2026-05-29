from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional
from django.db.models import Q

from apps.core.models import CategoriaRiesgo, ZonaRiesgo
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
    categoria: CategoriaOut
    latitud: float
    longitud: float
    radio_metros: int
    activo: bool

    class Config:
        from_attributes = True


class ZonaRiesgoCreate(BaseModel):
    nombre: str
    comuna: str = ""
    categoria_id: int
    latitud: float
    longitud: float
    radio_metros: int = 500


class ZonaRiesgoUpdate(BaseModel):
    nombre: Optional[str] = None
    comuna: Optional[str] = None
    categoria_id: Optional[int] = None
    latitud: Optional[float] = None
    longitud: Optional[float] = None
    radio_metros: Optional[int] = None
    activo: Optional[bool] = None


@router.get("/categorias", response_model=list[CategoriaOut])
def list_categorias():
    return list(CategoriaRiesgo.objects.all())


@router.get("/zonas-riesgo", response_model=list[ZonaRiesgoOut])
def list_zonas(
    activo: Optional[bool] = None,
    categoria_id: Optional[int] = None,
    comuna: Optional[str] = None,
    search: Optional[str] = Query(None, min_length=2),
    user=Depends(get_current_user),
):
    qs = ZonaRiesgo.objects.select_related("categoria").all()
    if activo is not None:
        qs = qs.filter(activo=activo)
    if categoria_id:
        qs = qs.filter(categoria_id=categoria_id)
    if comuna:
        qs = qs.filter(comuna__icontains=comuna)
    if search:
        qs = qs.filter(Q(nombre__icontains=search) | Q(comuna__icontains=search))
    return list(qs)


@router.get("/zonas-riesgo/{zona_id}", response_model=ZonaRiesgoOut)
def get_zona(zona_id: int, user=Depends(get_current_user)):
    zona = ZonaRiesgo.objects.select_related("categoria").filter(id=zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    return zona


@router.post("/zonas-riesgo", response_model=ZonaRiesgoOut, status_code=status.HTTP_201_CREATED)
def create_zona(data: ZonaRiesgoCreate, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    cat = CategoriaRiesgo.objects.filter(id=data.categoria_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    zona = ZonaRiesgo.objects.create(
        nombre=data.nombre,
        comuna=data.comuna,
        categoria=cat,
        latitud=data.latitud,
        longitud=data.longitud,
        radio_metros=data.radio_metros,
    )
    return zona


@router.put("/zonas-riesgo/{zona_id}", response_model=ZonaRiesgoOut)
def update_zona(zona_id: int, data: ZonaRiesgoUpdate, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    zona = ZonaRiesgo.objects.filter(id=zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    update_data = data.model_dump(exclude_unset=True)
    if "categoria_id" in update_data:
        cat = CategoriaRiesgo.objects.filter(id=update_data.pop("categoria_id")).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        zona.categoria = cat
    for field, value in update_data.items():
        setattr(zona, field, value)
    zona.save()
    return zona


@router.delete("/zonas-riesgo/{zona_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zona(zona_id: int, user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(status_code=403, detail="Solo administradores")
    zona = ZonaRiesgo.objects.filter(id=zona_id).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    zona.delete()
