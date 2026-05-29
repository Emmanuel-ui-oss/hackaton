from fastapi import APIRouter, HTTPException, status, Depends
from django.db import transaction
from apps.core.models import Item, Comentario, Categoria, Vehiculo, Conductor, Ruta
from api.schemas.item import (
    ItemCreate, ItemUpdate, ItemSchema, ComentarioCreate, ComentarioSchema
)
from api.dependencies import get_current_user
from api.pagination import Pagination, paginated_response as paginated
from django.contrib.auth.models import User

router = APIRouter(prefix="/api/v1", tags=["items"])


def _item_to_schema(item: Item) -> ItemSchema:
    comentarios = [
        ComentarioSchema(
            id=c.id,
            contenido=c.contenido,
            autor_username=c.autor.username,
            creado=c.creado,
        )
        for c in item.comentarios.all()
    ]
    return ItemSchema(
        id=item.id,
        codigo=item.codigo,
        descripcion=item.descripcion,
        valor=float(item.valor),
        peso_kg=float(item.peso_kg),
        estado=item.estado,
        origen=item.origen or "",
        destino=item.destino or "",
        categoria=item.categoria,
        vehiculo=item.vehiculo,
        conductor=item.conductor,
        ruta=item.ruta,
        creado_por_username=item.creado_por.username,
        creado=item.creado,
        actualizado=item.actualizado,
        comentarios=comentarios,
    )


@router.get("/items")
def list_items(pagination: Pagination = Depends(), user: User = Depends(get_current_user)):
    qs = Item.objects.all().select_related(
        "categoria", "vehiculo", "conductor", "ruta", "creado_por"
    ).prefetch_related("comentarios__autor")
    items, meta = pagination.apply(qs)
    return paginated([_item_to_schema(i) for i in items], meta)


@router.post("/items", response_model=ItemSchema, status_code=201)
def create_item(data: ItemCreate, user: User = Depends(get_current_user)):
    with transaction.atomic():
        categoria = Categoria.objects.filter(id=data.categoria_id).first() if data.categoria_id else None
        vehiculo = Vehiculo.objects.filter(id=data.vehiculo_id).first() if data.vehiculo_id else None
        conductor = Conductor.objects.filter(id=data.conductor_id).first() if data.conductor_id else None
        ruta = Ruta.objects.filter(id=data.ruta_id).first() if data.ruta_id else None

        item = Item.objects.create(
            codigo=data.codigo,
            descripcion=data.descripcion,
            valor=data.valor,
            peso_kg=data.peso_kg,
            estado=data.estado,
            origen=data.origen,
            destino=data.destino,
            categoria=categoria,
            vehiculo=vehiculo,
            conductor=conductor,
            ruta=ruta,
            creado_por=user,
        )
    return _item_to_schema(item)


@router.get("/items/{item_id}", response_model=ItemSchema)
def get_item(item_id: int, user: User = Depends(get_current_user)):
    try:
        item = Item.objects.select_related(
            "categoria", "vehiculo", "conductor", "ruta", "creado_por"
        ).prefetch_related("comentarios__autor").get(id=item_id)
    except Item.DoesNotExist:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return _item_to_schema(item)


@router.put("/items/{item_id}", response_model=ItemSchema)
def update_item(item_id: int, data: ItemUpdate, user: User = Depends(get_current_user)):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    with transaction.atomic():
        if data.descripcion is not None:
            item.descripcion = data.descripcion
        if data.valor is not None:
            item.valor = data.valor
        if data.peso_kg is not None:
            item.peso_kg = data.peso_kg
        if data.estado is not None:
            item.estado = data.estado
        if data.origen is not None:
            item.origen = data.origen
        if data.destino is not None:
            item.destino = data.destino
        if data.categoria_id is not None:
            item.categoria = Categoria.objects.filter(id=data.categoria_id).first()
        if data.vehiculo_id is not None:
            item.vehiculo = Vehiculo.objects.filter(id=data.vehiculo_id).first()
        if data.conductor_id is not None:
            item.conductor = Conductor.objects.filter(id=data.conductor_id).first()
        if data.ruta_id is not None:
            item.ruta = Ruta.objects.filter(id=data.ruta_id).first()
        item.save()

    return _item_to_schema(Item.objects.select_related(
        "categoria", "vehiculo", "conductor", "ruta", "creado_por"
    ).prefetch_related("comentarios__autor").get(id=item_id))


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, user: User = Depends(get_current_user)):
    try:
        item = Item.objects.get(id=item_id)
        item.delete()
    except Item.DoesNotExist:
        raise HTTPException(status_code=404, detail="Item no encontrado")


@router.post("/items/{item_id}/comentarios", response_model=ComentarioSchema, status_code=201)
def create_comentario(item_id: int, data: ComentarioCreate, user: User = Depends(get_current_user)):
    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    comentario = Comentario.objects.create(
        contenido=data.contenido,
        autor=user,
        item=item,
    )
    return ComentarioSchema(
        id=comentario.id,
        contenido=comentario.contenido,
        autor_username=comentario.autor.username,
        creado=comentario.creado,
    )
