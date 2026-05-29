from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional, Literal


class CategoriaSchema(BaseModel):
    id: int
    nombre: str
    descripcion: str

    class Config:
        from_attributes = True


class VehiculoSchema(BaseModel):
    id: int
    placa: str
    marca: str
    modelo: str
    tipo: str
    estado: str

    class Config:
        from_attributes = True


class ConductorSchema(BaseModel):
    id: int
    nombre: str
    documento: str
    licencia: str
    activo: bool

    class Config:
        from_attributes = True


class RutaSchema(BaseModel):
    id: int
    origen: str
    destino: str
    comuna_origen: str
    comuna_destino: str
    distancia_km: float
    nivel_riesgo: str
    accesible: bool

    class Config:
        from_attributes = True


class ComentarioCreate(BaseModel):
    contenido: str


class ComentarioSchema(BaseModel):
    id: int
    contenido: str
    autor_username: str
    creado: datetime

    class Config:
        from_attributes = True


class ItemCreate(BaseModel):
    codigo: str
    descripcion: str
    valor: float
    peso_kg: float
    estado: Literal["PENDIENTE", "TRANSITO", "ENTREGADO", "RETRASADO", "PERDIDO", "CANCELADO"] = "PENDIENTE"
    origen: str = ""
    destino: str = ""
    categoria_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    conductor_id: Optional[int] = None
    ruta_id: Optional[int] = None


class ItemUpdate(BaseModel):
    descripcion: Optional[str] = None
    valor: Optional[float] = None
    peso_kg: Optional[float] = None
    estado: Optional[Literal["PENDIENTE", "TRANSITO", "ENTREGADO", "RETRASADO", "PERDIDO", "CANCELADO"]] = None
    origen: Optional[str] = None
    destino: Optional[str] = None
    categoria_id: Optional[int] = None
    vehiculo_id: Optional[int] = None
    conductor_id: Optional[int] = None
    ruta_id: Optional[int] = None


class ItemSchema(BaseModel):
    id: int
    codigo: str
    descripcion: str
    valor: float
    peso_kg: float
    estado: str
    origen: str
    destino: str
    categoria: Optional[CategoriaSchema] = None
    vehiculo: Optional[VehiculoSchema] = None
    conductor: Optional[ConductorSchema] = None
    ruta: Optional[RutaSchema] = None
    creado_por_username: str
    creado: datetime
    actualizado: datetime
    comentarios: list[ComentarioSchema] = []

    class Config:
        from_attributes = True


class ZonaRiesgoCreate(BaseModel):
    nombre: str
    comuna: str = ""
    descripcion: str
    tipo_riesgo: str
    nivel: str = "MEDIO"
    latitud: float
    longitud: float
    radio_metros: int = 500


class ZonaRiesgoSchema(BaseModel):
    id: int
    nombre: str
    comuna: str
    descripcion: str
    tipo_riesgo: str
    nivel: str
    latitud: float
    longitud: float
    radio_metros: int
    activa: bool
    creado: datetime

    class Config:
        from_attributes = True


class ReporteComunitarioCreate(BaseModel):
    tipo: str
    descripcion: str
    ubicacion_texto: str = ""
    latitud: float
    longitud: float
    foto_url: str = ""


class ReporteComunitarioSchema(BaseModel):
    id: int
    tipo: str
    descripcion: str
    ubicacion_texto: str
    latitud: float
    longitud: float
    foto_url: str
    activo: bool
    votos_positivos: int
    votos_negativos: int
    usuario_username: str
    creado: datetime

    class Config:
        from_attributes = True


class VotoCreate(BaseModel):
    positivo: bool


class FavoritoCreate(BaseModel):
    nombre: str
    direccion: str
    latitud: float
    longitud: float


class FavoritoSchema(BaseModel):
    id: int
    nombre: str
    direccion: str
    latitud: float
    longitud: float
    creado: datetime

    class Config:
        from_attributes = True


class ContactoEmergenciaCreate(BaseModel):
    nombre: str
    telefono: str
    email: str = ""


class ContactoEmergenciaSchema(BaseModel):
    id: int
    nombre: str
    telefono: str
    email: str

    class Config:
        from_attributes = True


class EventoSOSSchema(BaseModel):
    id: int
    latitud: float
    longitud: float
    activo: bool
    contactos_notificados: list
    timestamp: datetime

    class Config:
        from_attributes = True


class LineaTransporteSchema(BaseModel):
    id: int
    nombre: str
    tipo: str
    codigo: str
    color: str
    descripcion: str
    activa: bool

    class Config:
        from_attributes = True


class ParadaSchema(BaseModel):
    id: int
    linea_id: int
    nombre: str
    direccion: str
    latitud: float
    longitud: float
    orden: int

    class Config:
        from_attributes = True


class HorarioSchema(BaseModel):
    id: int
    linea_id: int
    dia_semana: int
    hora_inicio: time
    hora_fin: time
    frecuencia_min: int

    class Config:
        from_attributes = True


class AlertaSchema(BaseModel):
    id: int
    zona_riesgo: Optional[ZonaRiesgoSchema] = None
    mensaje: str
    nivel: str
    leida: bool
    creado: datetime

    class Config:
        from_attributes = True


class HistorialViajeSchema(BaseModel):
    id: int
    origen_nombre: str
    destino_nombre: str
    distancia_km: Optional[float] = None
    tiempo_min: Optional[int] = None
    ruta: Optional[RutaSchema] = None
    costo_estimado: Optional[float] = None
    creado: datetime

    class Config:
        from_attributes = True
