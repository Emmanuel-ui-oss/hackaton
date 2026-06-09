from fastapi import APIRouter
from apps.core.models import RutaTransporte

router = APIRouter(tags=["Transporte"])


@router.get("/api/v1/transport")
def listar_rutas():
    rutas = RutaTransporte.objects.filter(activo=True).values(
        "id", "nombre", "tipo", "codigo", "color", "ruta_geojson", "paradas"
    )
    return list(rutas)
