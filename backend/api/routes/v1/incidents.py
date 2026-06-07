import csv, io
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from django.db.models import Count
from apps.core.models import IncidenteHomicidio, IncidenteTransito, EstacionPolicia
from api.dependencies import get_current_user
from api.utils.geo import parse_bbox

router = APIRouter()


def _grid_cluster(queryset, zoom: int):
    size = max(0.001, 0.05 / (2 ** (zoom - 10))) if zoom else 0.003
    buckets = {}
    for obj in queryset.iterator():
        lat_key = round(obj.latitud / size) * size
        lng_key = round(obj.longitud / size) * size
        key = (lat_key, lng_key)
        if key not in buckets:
            buckets[key] = {"lat": lat_key + size / 2, "lng": lng_key + size / 2, "count": 0, "barrio": ""}
        buckets[key]["count"] += 1
        if hasattr(obj, "barrio") and obj.barrio:
            buckets[key]["barrio"] = obj.barrio
    return list(buckets.values())


@router.get("/incidents/homicides")
def list_homicides(
    bbox: str = Query(None, pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$"),
    zoom: int = Query(12, ge=1, le=20),
):
    qs = IncidenteHomicidio.objects.all()
    if bbox:
        pb = parse_bbox(bbox)
        qs = qs.filter(latitud__gte=pb["lat_min"], latitud__lte=pb["lat_max"], longitud__gte=pb["lng_min"], longitud__lte=pb["lng_max"])
    clusters = _grid_cluster(qs, zoom)
    return {"clusters": clusters, "total": len(clusters), "loading": False}


@router.get("/incidents/traffic")
def list_traffic_incidents(
    bbox: str = Query(None, pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$"),
    zoom: int = Query(12, ge=1, le=20),
):
    qs = IncidenteTransito.objects.all()
    if bbox:
        pb = parse_bbox(bbox)
        qs = qs.filter(latitud__gte=pb["lat_min"], latitud__lte=pb["lat_max"], longitud__gte=pb["lng_min"], longitud__lte=pb["lng_max"])
    clusters = _grid_cluster(qs, zoom)
    return {"clusters": clusters, "total": len(clusters), "loading": False}


@router.get("/poi/police-stations")
def list_police_stations(bbox: str = Query(None, pattern=r"^-?[\d.]+,-?[\d.]+,-?[\d.]+,-?[\d.]+$")):
    qs = EstacionPolicia.objects.filter(activo=True)
    if bbox:
        pb = parse_bbox(bbox)
        qs = qs.filter(latitud__gte=pb["lat_min"], latitud__lte=pb["lat_max"], longitud__gte=pb["lng_min"], longitud__lte=pb["lng_max"])
    return [
        {"id": p.id, "nombre": p.nombre, "direccion": p.direccion, "lat": p.latitud, "lng": p.longitud}
        for p in qs
    ]


@router.post("/admin/upload-csv/homicides", status_code=201)
def upload_homicides_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(403, detail="Solo administradores")
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        try:
            IncidenteHomicidio.objects.create(
                latitud=float(row.get("latitud", row.get("lat", 0))),
                longitud=float(row.get("longitud", row.get("lng", row.get("lon", 0)))),
                barrio=row.get("nombre_barrio", row.get("barrio", "")),
                comuna=row.get("comuna", ""),
                anio=int(row["anio"]) if row.get("anio") else None,
                fuente=row.get("fuente", "csv_upload"),
            )
            count += 1
        except (ValueError, KeyError):
            continue
    return {"imported": count}


@router.post("/admin/upload-csv/traffic", status_code=201)
def upload_traffic_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(403, detail="Solo administradores")
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        try:
            IncidenteTransito.objects.create(
                latitud=float(row.get("latitud", row.get("lat", 0))),
                longitud=float(row.get("longitud", row.get("lng", row.get("lon", 0)))),
                tipo=row.get("tipo", row.get("clase", "")),
                gravedad=row.get("gravedad", row.get("nivel", "")),
                comuna=row.get("comuna", ""),
                anio=int(row["anio"]) if row.get("anio") else None,
                fuente=row.get("fuente", "csv_upload"),
            )
            count += 1
        except (ValueError, KeyError):
            continue
    return {"imported": count}


@router.post("/admin/upload-csv/police", status_code=201)
def upload_police_csv(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not user.is_staff:
        raise HTTPException(403, detail="Solo administradores")
    content = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    count = 0
    for row in reader:
        try:
            EstacionPolicia.objects.create(
                nombre=row.get("nombre", ""),
                direccion=row.get("direccion", ""),
                latitud=float(row.get("latitud", row.get("lat", 0))),
                longitud=float(row.get("longitud", row.get("lng", row.get("lon", 0)))),
                telefono=row.get("telefono", ""),
            )
            count += 1
        except (ValueError, KeyError):
            continue
    return {"imported": count}
