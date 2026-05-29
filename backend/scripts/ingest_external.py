"""
Script de ingesta de fuentes externas (SIMUR, DAGRD, etc.)

Ejecutar con: python backend/scripts/ingest_external.py
O como cron: */5 * * * * cd /app && python backend/scripts/ingest_external.py
"""
import os
import sys
import json
import urllib.request
import urllib.error
from datetime import datetime, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from django.utils import timezone
from apps.core.models import EventoRiesgo


FUENTES = [
    {
        "nombre": "simur",
        "url": "https://simur.medellin.gov.co/api/eventos",  # placeholder
        "parser": "parse_simur",
    },
    {
        "nombre": "dagrd",
        "url": "https://dagrd.medellin.gov.co/api/alertas",  # placeholder
        "parser": "parse_dagrd",
    },
]


def parse_simur(raw: dict) -> dict:
    """Normaliza JSON de SIMUR a dict compatible con EventoRiesgo."""
    return {
        "tipo": raw.get("tipo_evento", "otro"),
        "nivel": raw.get("severidad", "medio"),
        "fuente": "simur",
        "titulo": raw.get("titulo", "Evento SIMUR"),
        "descripcion": raw.get("descripcion", ""),
        "latitud": float(raw.get("latitud", 0)),
        "longitud": float(raw.get("longitud", 0)),
        "radio_impacto_metros": int(raw.get("radio", 300)),
        "expira_en": timezone.now() + timedelta(hours=int(raw.get("vigencia_horas", 6))),
        "datos_raw": raw,
    }


def parse_dagrd(raw: dict) -> dict:
    """Normaliza JSON de DAGRD a dict compatible con EventoRiesgo."""
    return {
        "tipo": raw.get("clase", "otro"),
        "nivel": raw.get("nivel_alerta", "medio"),
        "fuente": "dagrd",
        "titulo": raw.get("nombre", "Alerta DAGRD"),
        "descripcion": raw.get("detalle", ""),
        "latitud": float(raw.get("lat", 0)),
        "longitud": float(raw.get("lon", 0)),
        "radio_impacto_metros": int(raw.get("radio_afectacion", 300)),
        "expira_en": timezone.now() + timedelta(hours=int(raw.get("duracion_horas", 4))),
        "datos_raw": raw,
    }


def fetch_source(url: str) -> list:
    """Intenta obtener datos de una API externa. Retorna [] si falla."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "HackatonApp/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data if isinstance(data, list) else data.get("resultados", data.get("data", []))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, ValueError) as e:
        print(f"[ingest] Error consultando {url}: {e}")
        return []


def ingest_source(nombre: str, url: str, parser_name: str):
    """Obtiene datos de una fuente, normaliza y guarda eventos nuevos."""
    raw_list = fetch_source(url)
    if not raw_list:
        return 0

    parser = globals().get(parser_name)
    if not parser:
        print(f"[ingest] Parser '{parser_name}' no encontrado")
        return 0

    creados = 0
    for raw in raw_list:
        try:
            data = parser(raw)
            if not data["latitud"] and not data["longitud"]:
                continue

            _, created = EventoRiesgo.objects.update_or_create(
                fuente=data["fuente"],
                tipo=data["tipo"],
                titulo=data["titulo"],
                latitud=data["latitud"],
                longitud=data["longitud"],
                defaults={
                    "nivel": data["nivel"],
                    "descripcion": data["descripcion"],
                    "radio_impacto_metros": data["radio_impacto_metros"],
                    "expira_en": data["expira_en"],
                    "datos_raw": data["datos_raw"],
                    "activo": True,
                },
            )
            if created:
                creados += 1
        except Exception as e:
            print(f"[ingest] Error procesando item de {nombre}: {e}")

    return creados


def limpiar_expirados():
    """Marca como inactivos los eventos expirados."""
    count = EventoRiesgo.objects.filter(
        activo=True, expira_en__isnull=False, expira_en__lt=timezone.now()
    ).update(activo=False)
    if count:
        print(f"[ingest] {count} eventos expirados desactivados")
    return count


def seed_datos_ejemplo():
    """Carga datos de ejemplo para desarrollo si no hay eventos."""
    if EventoRiesgo.objects.exists():
        return

    ejemplos = [
        {
            "tipo": "inundacion",
            "nivel": "alto",
            "fuente": "simur",
            "titulo": "Inundación - Barrio Antioquia",
            "descripcion": "Acumulación de agua en la calle 45 con carrera 52. Se recomienda evitar la zona.",
            "latitud": 6.2476,
            "longitud": -75.5658,
            "radio_impacto_metros": 500,
            "expira_en": timezone.now() + timedelta(hours=6),
        },
        {
            "tipo": "deslizamiento",
            "nivel": "critico",
            "fuente": "dagrd",
            "titulo": "Deslizamiento - Comuna 8",
            "descripcion": "Deslizamiento de tierra en la ladera de la comuna 8. Vías cerradas.",
            "latitud": 6.2301,
            "longitud": -75.5782,
            "radio_impacto_metros": 400,
            "expira_en": timezone.now() + timedelta(hours=12),
        },
        {
            "tipo": "incendio",
            "nivel": "alto",
            "fuente": "simur",
            "titulo": "Incendio estructural - Centro",
            "descripcion": "Incendio en edificio residencial en la carrera 50 con calle 41.",
            "latitud": 6.2511,
            "longitud": -75.5632,
            "radio_impacto_metros": 200,
            "expira_en": timezone.now() + timedelta(hours=4),
        },
        {
            "tipo": "accidente_vial",
            "nivel": "medio",
            "fuente": "usuario",
            "titulo": "Accidente de tránsito - Av. Las Vegas",
            "descripcion": "Colisión múltiple en la avenida Las Vegas con calle 30.",
            "latitud": 6.2226,
            "longitud": -75.5705,
            "radio_impacto_metros": 150,
            "expira_en": timezone.now() + timedelta(hours=2),
        },
        {
            "tipo": "fuga_gas",
            "nivel": "critico",
            "fuente": "dagrd",
            "titulo": "Fuga de gas - Laureles",
            "descripcion": "Fuga de gas detectada en la carrera 70 con calle 44. Evacuar la zona.",
            "latitud": 6.2413,
            "longitud": -75.5962,
            "radio_impacto_metros": 300,
            "expira_en": timezone.now() + timedelta(hours=3),
        },
        {
            "tipo": "vendaval",
            "nivel": "alto",
            "fuente": "simur",
            "titulo": "Vendaval - Belén",
            "descripcion": "Vientos fuertes reportados en el sector de Belén. Árboles caídos.",
            "latitud": 6.2154,
            "longitud": -75.5928,
            "radio_impacto_metros": 800,
            "expira_en": timezone.now() + timedelta(hours=5),
        },
    ]

    for data in ejemplos:
        EventoRiesgo.objects.create(**data)

    print(f"[ingest] {len(ejemplos)} eventos de ejemplo creados")


def run():
    print(f"[ingest] Iniciando ingesta - {datetime.now().isoformat()}")

    seed_datos_ejemplo()

    total = 0
    for fuente in FUENTES:
        count = ingest_source(fuente["nombre"], fuente["url"], fuente["parser"])
        total += count
        print(f"[ingest] {fuente['nombre']}: {count} nuevos eventos")

    limpiar_expirados()
    print(f"[ingest] Completado - {total} eventos nuevos")


if __name__ == "__main__":
    run()
