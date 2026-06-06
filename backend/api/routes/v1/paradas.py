from fastapi import APIRouter, Depends
from apps.core.models import Parada
from api.dependencies import get_current_user

router = APIRouter()


@router.get("/paradas")
def list_paradas(user=Depends(get_current_user)):
    qs = Parada.objects.filter(activo=True).select_related("linea").order_by("linea__codigo", "orden")
    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "direccion": p.direccion,
            "latitud": p.latitud,
            "longitud": p.longitud,
            "orden": p.orden,
            "linea_id": p.linea.id,
            "linea_nombre": p.linea.nombre,
            "linea_codigo": p.linea.codigo,
            "linea_color": p.linea.color,
            "linea_tipo": p.linea.tipo,
            "linea_ruta_geojson": p.linea.ruta_geojson,
        }
        for p in qs
    ]
