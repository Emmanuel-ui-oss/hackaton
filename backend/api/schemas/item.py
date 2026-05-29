from pydantic import BaseModel
from typing import Optional


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


class ReporteOut(BaseModel):
    id: int
    tipo: str
    descripcion: str
    ubicacion: str
    latitud: float
    longitud: float
    usuario: str
    estado: str
    creado: str

    class Config:
        from_attributes = True


class EventoRiesgoOut(BaseModel):
    id: int
    tipo: str
    nivel: str
    fuente: str
    titulo: str
    descripcion: str
    latitud: float
    longitud: float
    radio_impacto_metros: int
    activo: bool
    expira_en: Optional[str] = None
    creado: str

    class Config:
        from_attributes = True
