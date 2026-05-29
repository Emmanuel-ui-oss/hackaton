from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from apps.core.models import EventoRiesgo


class Command(BaseCommand):
    help = "Ingesta datos de fuentes externas (SIMUR, DAGRD) y datos de ejemplo"

    def add_arguments(self, parser):
        parser.add_argument(
            "--seed",
            action="store_true",
            help="Carga datos de ejemplo si no existen eventos",
        )
        parser.add_argument(
            "--clean",
            action="store_true",
            help="Limpia eventos expirados",
        )

    def handle(self, *args, **options):
        if options["clean"]:
            count = EventoRiesgo.objects.filter(
                activo=True, expira_en__isnull=False, expira_en__lt=timezone.now()
            ).update(activo=False)
            self.stdout.write(f"Eventos expirados desactivados: {count}")

        if options["seed"] or not EventoRiesgo.objects.exists():
            self._seed()
        else:
            self.stdout.write("Ya existen eventos, omite seed. Usa --seed para forzar.")

        self.stdout.write(self.style.SUCCESS("Ingesta completada"))

    def _seed(self):
        ejemplos = [
            {
                "tipo": "inundacion", "nivel": "alto", "fuente": "simur",
                "titulo": "Inundación - Barrio Antioquia",
                "descripcion": "Acumulación de agua en la calle 45 con carrera 52.",
                "latitud": 6.2476, "longitud": -75.5658, "radio_impacto_metros": 500,
                "expira_en": timezone.now() + timezone.timedelta(hours=6),
            },
            {
                "tipo": "deslizamiento", "nivel": "critico", "fuente": "dagrd",
                "titulo": "Deslizamiento - Comuna 8",
                "descripcion": "Deslizamiento de tierra en la ladera de la comuna 8.",
                "latitud": 6.2301, "longitud": -75.5782, "radio_impacto_metros": 400,
                "expira_en": timezone.now() + timezone.timedelta(hours=12),
            },
            {
                "tipo": "incendio", "nivel": "alto", "fuente": "simur",
                "titulo": "Incendio estructural - Centro",
                "descripcion": "Incendio en edificio residencial en el centro.",
                "latitud": 6.2511, "longitud": -75.5632, "radio_impacto_metros": 200,
                "expira_en": timezone.now() + timezone.timedelta(hours=4),
            },
            {
                "tipo": "accidente_vial", "nivel": "medio", "fuente": "usuario",
                "titulo": "Accidente de tránsito - Av. Las Vegas",
                "descripcion": "Colisión múltiple en la avenida Las Vegas.",
                "latitud": 6.2226, "longitud": -75.5705, "radio_impacto_metros": 150,
                "expira_en": timezone.now() + timezone.timedelta(hours=2),
            },
            {
                "tipo": "fuga_gas", "nivel": "critico", "fuente": "dagrd",
                "titulo": "Fuga de gas - Laureles",
                "descripcion": "Fuga de gas en la carrera 70 con calle 44.",
                "latitud": 6.2413, "longitud": -75.5962, "radio_impacto_metros": 300,
                "expira_en": timezone.now() + timezone.timedelta(hours=3),
            },
            {
                "tipo": "vendaval", "nivel": "alto", "fuente": "simur",
                "titulo": "Vendaval - Belén",
                "descripcion": "Vientos fuertes en Belén. Árboles caídos.",
                "latitud": 6.2154, "longitud": -75.5928, "radio_impacto_metros": 800,
                "expira_en": timezone.now() + timezone.timedelta(hours=5),
            },
        ]

        for data in ejemplos:
            EventoRiesgo.objects.create(**data)
            self.stdout.write(f"  Creado: {data['titulo']}")

        self.stdout.write(f"{len(ejemplos)} eventos de ejemplo creados")
