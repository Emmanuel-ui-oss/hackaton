import json, os
from django.conf import settings
from django.core.management.base import BaseCommand
from apps.core.models import RutaTransporte

DATA_FILE = os.path.join(settings.BASE_DIR, "data", "transporte.json")

class Command(BaseCommand):
    help = "Importa rutas de transporte desde data/transporte.json"

    def handle(self, *args, **options):
        if not os.path.exists(DATA_FILE):
            self.stderr.write(f"No se encontró {DATA_FILE}")
            return
        with open(DATA_FILE, encoding="utf-8") as f:
            rutas = json.load(f)
        creadas = 0
        actualizadas = 0
        for r in rutas:
            obj, created = RutaTransporte.objects.update_or_create(
                codigo=r["codigo"],
                defaults={
                    "nombre": r["nombre"],
                    "tipo": r["tipo"],
                    "color": r.get("color", "#00c853"),
                    "ruta_geojson": r["ruta_geojson"],
                    "paradas": r.get("paradas", []),
                    "activo": True,
                },
            )
            if created:
                creadas += 1
            else:
                actualizadas += 1
        self.stdout.write(f"Importadas: {creadas} creadas, {actualizadas} actualizadas")
