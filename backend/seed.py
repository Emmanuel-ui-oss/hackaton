import os, django
from datetime import date, timedelta, time
from random import choice, randint

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from django.utils import timezone

from django.contrib.auth.models import User
from apps.core.models import (
    ZonaRiesgo, CategoriaRiesgo, EventoRiesgo, ReporteIncidente, VotoReporte,
    Favorito, ContactoEmergencia, EventoSOS, Alerta, HistorialViaje,
    LineaTransporte, Parada,
)


def run():
    print("Creando seed data...")

    # ── USUARIOS ──
    admin, _ = User.objects.get_or_create(username="admin", defaults={"email": "admin@test.com", "is_staff": True, "is_superuser": True})
    admin.set_password("admin123")
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()
    user, _ = User.objects.get_or_create(username="demo", defaults={"email": "demo@test.com"})
    user.set_password("demo123")
    user.save()
    user2, _ = User.objects.get_or_create(username="maria", defaults={"email": "maria@test.com"})
    user2.set_password("maria123")
    user2.save()

    # ── ZONAS DE RIESGO POR COMUNA (RF-01, RF-03, RF-11) ──
    zonas_medellin = [
        ("Comuna 1 - Popular", "Popular", "Zona histórica de alta conflictividad, procesos de transformación social",
         "VIOLENCIA", "ALTO", 6.2600, -75.5600, 800),
        ("Comuna 2 - Santa Cruz", "Santa Cruz", "Sectores con incidentes de seguridad recurrentes",
         "VIOLENCIA", "ALTO", 6.2700, -75.5550, 600),
        ("Comuna 3 - Manrique", "Manrique", "Zona con deslizamientos en temporada de lluvias",
         "DESLIZAMIENTO", "ALTO", 6.2550, -75.5500, 700),
        ("Comuna 4 - Aranjuez", "Aranjuez", "Zona de riesgo medio, varios reportes de hurtos",
         "ROBO", "MEDIO", 6.2500, -75.5450, 500),
        ("Comuna 5 - Castilla", "Castilla", "Congestión vehicular y alta accidentalidad",
         "ACCIDENTE", "MEDIO", 6.2650, -75.5700, 600),
        ("Comuna 6 - Doce de Octubre", "Doce de Octubre", "Zona con problemas de inundaciones",
         "INUNDACION", "ALTO", 6.2750, -75.5750, 500),
        ("Comuna 7 - Robledo", "Robledo", "Riesgo de deslizamiento en laderas",
         "DESLIZAMIENTO", "CRITICO", 6.2450, -75.5800, 800),
        ("Comuna 8 - Villa Hermosa", "Villa Hermosa", "Zona de riesgo por deslizamientos y violencia",
         "VIOLENCIA", "ALTO", 6.2350, -75.5400, 600),
        ("Comuna 9 - Buenos Aires", "Buenos Aires", "Zona residencial con incidentes esporádicos",
         "OTRO", "BAJO", 6.2250, -75.5300, 400),
        ("Comuna 10 - La Candelaria", "La Candelaria", "Centro histórico, alta afluencia, riesgo de hurtos",
         "ROBO", "ALTO", 6.2150, -75.5250, 500),
        ("Comuna 11 - Laureles", "Laureles - Estadio", "Zona turística y comercial, riesgo medio de hurtos",
         "ROBO", "MEDIO", 6.2350, -75.5900, 400),
        ("Comuna 12 - La América", "La América", "Zona residencial de nivel de riesgo bajo",
         "VIOLENCIA", "BAJO", 6.2400, -75.6000, 400),
        ("Comuna 13 - San Javier", "San Javier", "Zona de alta conflictividad histórica, proceso de transformación",
         "VIOLENCIA", "CRITICO", 6.2500, -75.6100, 900),
        ("Comuna 14 - El Poblado", "El Poblado", "Zona de alta afluencia, riesgo de hurtos en sector nocturno",
         "ROBO", "MEDIO", 6.2000, -75.5600, 500),
        ("Comuna 15 - Guayabal", "Guayabal", "Zona industrial, riesgo de accidentes de tránsito",
         "ACCIDENTE", "MEDIO", 6.1900, -75.5700, 600),
        ("Comuna 16 - Belén", "Belén", "Zona residencial de riesgo bajo, algunos hurtos",
         "ROBO", "BAJO", 6.2100, -75.5900, 500),
    ]
    zonas = []
    for nombre, comuna, desc, tipo, nivel, lat, lng, radio in zonas_medellin:
        z, _ = ZonaRiesgo.objects.get_or_create(
            nombre=nombre,
            defaults=dict(comuna=comuna, descripcion=desc, tipo_riesgo=tipo,
                          nivel=nivel, latitud=lat, longitud=lng, radio_metros=radio)
        )
        zonas.append(z)

    # ── CATEGORÍAS DE RIESGO ──
    categorias_data = [
        ("Accidentes Viales", "alto", "#D32F2F", "Zonas con alta tasa de accidentes de tránsito"),
        ("Seguridad Ciudadana", "critico", "#E30613", "Zonas con hurtos, violencia y conflictividad social"),
        ("Riesgo Climático", "alto", "#F57F17", "Zonas propensas a inundaciones y deslizamientos"),
        ("Movilidad y Tráfico", "medio", "#FBC02D", "Zonas con congestión vehicular crónica"),
        ("Infraestructura", "bajo", "#388E3C", "Zonas con daños en vías o infraestructura pública"),
    ]
    for nombre, nivel, color, desc in categorias_data:
        CategoriaRiesgo.objects.get_or_create(
            nombre=nombre,
            defaults=dict(nivel=nivel, color=color, descripcion=desc)
        )

    # ── ASIGNAR CATEGORÍAS A ZONAS ──
    cat_accidentes = CategoriaRiesgo.objects.get(nombre="Accidentes Viales")
    cat_seguridad = CategoriaRiesgo.objects.get(nombre="Seguridad Ciudadana")
    cat_climatico = CategoriaRiesgo.objects.get(nombre="Riesgo Climático")
    cat_trafico = CategoriaRiesgo.objects.get(nombre="Movilidad y Tráfico")
    for z in zonas:
        if z.tipo_riesgo in ("ACCIDENTE",):
            z.categoria = cat_accidentes
        elif z.tipo_riesgo in ("VIOLENCIA", "ROBO"):
            z.categoria = cat_seguridad
        elif z.tipo_riesgo in ("INUNDACION", "DESLIZAMIENTO"):
            z.categoria = cat_climatico
        else:
            z.categoria = cat_trafico
        z.save()

    # ── EVENTOS DE RIESGO (EventoRiesgo) ──
    eventos_data = [
        # (tipo, nivel, fuente, titulo, desc, lat, lng, radio, dias_expira)
        ("accidente_vial", "critico", "simur", "Choque múltiple Av. Regional altura Santa Fe",
         "Colisión entre 3 vehículos con 2 personas lesionadas en la Avenida Regional", 6.2200, -75.5700, 500, 1),
        ("accidente_vial", "alto", "simur", "Atropello en Av. El Poblado con Lleras",
         "Peatón atropellado por motocicleta en la intersección de la zona rosa", 6.2050, -75.5620, 200, 2),
        ("accidente_vial", "alto", "simur", "Colisión en Puente de la 4 Sur",
         "Accidente de tránsito entre bus y vehículo particular en el puente de la 4 Sur", 6.1900, -75.5650, 300, 1),
        ("accidente_vial", "medio", "simur", "Choque en Av. 33 con Cra 70",
         "Colisión leve entre dos automóviles, sin lesionados", 6.2350, -75.5900, 150, 1),
        ("accidente_vial", "critico", "simur", "Volcamiento en Av. Las Vegas",
         "Vehículo volcado en la Avenida Las Vegas a la altura del CC Vizcaya", 6.1950, -75.5670, 400, 2),
        ("inundacion", "critico", "dagrd", "Inundación en Av. San Juan con 65",
         "Acumulación de agua de 40cm por colapso de alcantarillado en temporada de lluvias", 6.2300, -75.5750, 600, 1),
        ("inundacion", "alto", "dagrd", "Inundación en la Comuna 6 - Doce de Octubre",
         "Varias vías anegadas por fuertes lluvias en el noroccidente de la ciudad", 6.2750, -75.5750, 800, 1),
        ("inundacion", "alto", "dagrd", "Inundación en Quebrada La Iguaná",
         "Desbordamiento de la quebrada afecta viviendas aledañas en la Comuna 7", 6.2450, -75.5800, 500, 2),
        ("deslizamiento", "critico", "dagrd", "Deslizamiento en Comuna 13 - San Javier",
         "Desprendimiento de tierra en ladera cercana a viviendas, 5 familias evacuadas", 6.2500, -75.6100, 400, 3),
        ("deslizamiento", "alto", "dagrd", "Deslizamiento en Comuna 3 - Manrique",
         "Caída de rocas bloquea vía principal en el sector de Manrique Oriental", 6.2550, -75.5500, 300, 2),
        ("deslizamiento", "alto", "dagrd", "Deslizamiento en Comuna 7 - Robledo",
         "Movimiento de masa en ladera del sector Pajarito, vía parcialmente cerrada", 6.2450, -75.5850, 350, 2),
        ("incendio", "critico", "simur", "Incendio estructural en el Centro de Medellín",
         "Incendio en edificio comercial en la Cra 50 con 49, 3 heridos", 6.2180, -75.5580, 200, 1),
        ("incendio", "alto", "simur", "Incendio forestal en Cerro El Volador",
         "Quema de pastizales en el cerro tutelar, unidades de bomberos en el lugar", 6.2400, -75.5780, 500, 1),
        ("fuga_gas", "alto", "dagrd", "Fuga de gas en Laureles",
         "Rotura de tubería de gas en obra de construcción en la Calle 35 con 76", 6.2300, -75.5950, 200, 1),
        ("colapso", "critico", "dagrd", "Colapso de muro en Comuna 8",
         "Muro de contención colapsa en Villa Hermosa afectando 2 viviendas", 6.2350, -75.5400, 250, 3),
        ("vendaval", "alto", "dagrd", "Vendaval en zona oriental de Medellín",
         "Vientos fuertes afectan techos de viviendas en Comuna 9 - Buenos Aires", 6.2250, -75.5300, 600, 1),
        ("accidente_vial", "medio", "usuario", "Accidente de moto en Av. Oriental",
         "Motociclista derrapa en la Avenida Oriental con 45, reporta lesiones leves", 6.2200, -75.5550, 100, 1),
        ("accidente_vial", "alto", "simur", "Choque entre bus y taxi en la Terminal del Norte",
         "Colisión en el acceso a la Terminal de Transporte, 2 heridos leves", 6.2600, -75.5400, 200, 1),
        ("inundacion", "critico", "dagrd", "Emergencia por lluvias en Av. 80",
         "Vía completamente inundada en la intersección de la 80 con San Juan", 6.2300, -75.5820, 500, 1),
        ("accidente_vial", "critico", "simur", "Accidente múltiple en Túnel de Oriente",
         "Colisión entre 4 vehículos dentro del túnel, 1 persona atrapada", 6.1800, -75.5400, 300, 1),
        ("deslizamiento", "alto", "dagrd", "Deslizamiento preventivo en Comuna 1 - Popular",
         "Sector en monitoreo por grietas en el terreno después de lluvias intensas", 6.2600, -75.5600, 400, 2),
        ("inundacion", "medio", "usuario", "Agua en sótanos de edificios El Poblado",
         "Varios edificios reportan entrada de agua en parqueaderos subterráneos", 6.2020, -75.5630, 200, 1),
        ("otro", "bajo", "usuario", "Semáforo fuera de servicio en Av. Nutibara",
         "Semáforo en la 70 con Nutibara no funciona, riesgo para peatones", 6.2400, -75.5850, 50, 1),
        ("accidente_vial", "alto", "simur", "Choque en el sector de Itagüí",
         "Colisión en la Autopista Sur a la altura de Itagüí, 2 heridos", 6.1700, -75.5750, 250, 1),
        ("inundacion", "medio", "usuario", "Represamiento en quebrada La Presidenta",
         "La quebrada presenta alto caudal y riesgo de desbordamiento en El Poblado", 6.1980, -75.5600, 300, 1),
    ]

    now = timezone.now()
    for tipo, nivel, fuente, titulo, desc, lat, lng, radio, dias in eventos_data:
        EventoRiesgo.objects.get_or_create(
            titulo=titulo,
            defaults=dict(
                tipo=tipo, nivel=nivel, fuente=fuente, descripcion=desc,
                latitud=lat, longitud=lng, radio_impacto_metros=radio,
                activo=True, expira_en=now + timedelta(days=dias),
                creado=now - timedelta(hours=choice(range(1, 48))),
            )
        )

    # ── LÍNEAS DE TRANSPORTE PÚBLICO (RF-06, RF-16) ──
    lineas_data = [
        ("Línea A", "METRO", "L1", "#E30613", "Línea A del Metro de Medellín: Niquía → La Estrella"),
        ("Línea B", "METRO", "L2", "#00A650", "Línea B: San Antonio → San Javier"),
        ("Línea 1", "METROPLUS", "M1", "#F58220", "Metroplús Línea 1: Universidad → Parque de Aranjuez"),
        ("Línea 2", "METROPLUS", "M2", "#F58220", "Metroplús Línea 2: Universidad → Santa Mónica"),
        ("Tranvía de Ayacucho", "TRANVIA", "T1", "#C4D600", "Tranvía: San Antonio → Oriente"),
        ("Metrocable Línea K", "CABLE", "K1", "#E30613", "Metrocable: Acevedo → Santo Domingo"),
        ("Metrocable Línea J", "CABLE", "J1", "#00A650", "Metrocable: San Javier → La Aurora"),
        ("Metrocable Línea L", "CABLE", "L1", "#0054A6", "Metrocable: Santo Domingo → Parque Arví"),
        ("Metrocable Línea M", "CABLE", "M1", "#F58220", "Metrocable: Miraflores → Trece de Noviembre"),
        ("Metrocable Línea H", "CABLE", "H1", "#C4D600", "Metrocable: Oriente → Villa Sierra"),
    ]
    lineas = []
    for nombre, tipo, cod, color, desc in lineas_data:
        ln, _ = LineaTransporte.objects.get_or_create(
            codigo=cod,
            defaults=dict(nombre=nombre, tipo=tipo, color=color, descripcion=desc)
        )
        lineas.append(ln)

    # ── PARADAS ──
    paradas_data = {
        "L1": [
            ("Niquía", 6.3100, -75.5500, 1),
            ("Bello", 6.2900, -75.5450, 2),
            ("Madera", 6.2750, -75.5450, 3),
            ("Acevedo", 6.2650, -75.5450, 4),
            ("Tricentenario", 6.2550, -75.5450, 5),
            ("Caribe", 6.2450, -75.5500, 6),
            ("Universidad", 6.2380, -75.5550, 7),
            ("Estadio", 6.2350, -75.5800, 8),
            ("Suramericana", 6.2300, -75.5750, 9),
            ("Exposiciones", 6.2250, -75.5650, 10),
            ("San Antonio", 6.2150, -75.5600, 11),
            ("Alpujarra", 6.2100, -75.5600, 12),
            ("Poblado", 6.2000, -75.5650, 13),
            ("Industriales", 6.1900, -75.5700, 14),
            ("Itagüí", 6.1700, -75.5750, 15),
            ("La Estrella", 6.1550, -75.5800, 16),
        ],
        "K1": [
            ("Acevedo", 6.2650, -75.5450, 1),
            ("Santo Domingo Savio", 6.2800, -75.5480, 2),
            ("Santo Domingo", 6.2900, -75.5480, 3),
        ],
        "L2": [
            ("San Antonio", 6.2150, -75.5600, 1),
            ("Cisneros", 6.2250, -75.5800, 2),
            ("Suramericana", 6.2300, -75.5750, 3),
            ("Estadio", 6.2350, -75.5800, 4),
            ("Floresta", 6.2400, -75.5900, 5),
            ("Santa Lucía", 6.2450, -75.5950, 6),
            ("San Javier", 6.2500, -75.6100, 7),
        ],
        "M1": [
            ("Universidad", 6.2380, -75.5550, 1),
            ("Minorista", 6.2400, -75.5600, 2),
            ("Chagualo", 6.2450, -75.5650, 3),
            ("Pichincha", 6.2500, -75.5700, 4),
            ("Hospital", 6.2550, -75.5750, 5),
            ("Barrio Triste", 6.2500, -75.5800, 6),
            ("Parque de Aranjuez", 6.2600, -75.5650, 7),
        ],
        "M2": [
            ("Universidad", 6.2380, -75.5550, 1),
            ("Pichincha", 6.2500, -75.5700, 2),
            ("Parque Berrío", 6.2180, -75.5650, 3),
            ("San Antonio", 6.2150, -75.5600, 4),
            ("Plaza Mayor", 6.2200, -75.5700, 5),
            ("Nutibara", 6.2250, -75.5800, 6),
            ("Santa Mónica", 6.2300, -75.5950, 7),
        ],
        "J1": [
            ("San Javier", 6.2500, -75.6100, 1),
            ("Juan XXIII", 6.2550, -75.6150, 2),
            ("Vallejuelos", 6.2600, -75.6200, 3),
            ("La Aurora", 6.2650, -75.6250, 4),
        ],
        "H1": [
            ("Oriente", 6.2400, -75.5350, 1),
            ("Las Torres", 6.2450, -75.5300, 2),
            ("Villa Sierra", 6.2500, -75.5250, 3),
        ],
        "T1": [
            ("San Antonio", 6.2150, -75.5600, 1),
            ("San José", 6.2200, -75.5550, 2),
            ("La Playa", 6.2250, -75.5520, 3),
            ("Buenos Aires", 6.2300, -75.5450, 4),
            ("Miraflores", 6.2350, -75.5380, 5),
            ("Oriente", 6.2400, -75.5350, 6),
        ],
    }
    for linea in lineas:
        if linea.codigo in paradas_data:
            for nombre, lat, lng, orden in paradas_data[linea.codigo]:
                Parada.objects.get_or_create(
                    linea=linea, orden=orden,
                    defaults=dict(nombre=nombre, direccion=f"Estación {nombre}, Medellín",
                                  latitud=lat, longitud=lng, activo=True)
                )

    # ── REPORTES COMUNITARIOS (RF-05, CU-02) ──
    reportes_data = [
        ("ACCIDENTE", "Choque múltiple en la Avenida Regional frente al CC Santa Fe",
         "Av. Regional, Medellín", 6.2200, -75.5700),
        ("ZONA_PELIGROSA", "Reportan disparos cerca de la estación San Javier",
         "San Javier, Comuna 13", 6.2500, -75.6100),
        ("BLOQUEO", "Manifestación bloquea la Avenida Oriental",
         "Av. Oriental, Centro", 6.2200, -75.5550),
        ("ROBO", "Hurto a transporte público en la Terminal del Norte",
         "Terminal de Transporte del Norte", 6.2600, -75.5400),
        ("INUNDACION", "Inundación en la Avenida Las Vegas por fuertes lluvias",
         "Av. Las Vegas, El Poblado", 6.1950, -75.5650),
        ("DESLIZAMIENTO", "Deslizamiento en la Comuna 3 - Manrique bloquea vía",
         "Manrique, Medellín", 6.2550, -75.5500),
        ("OTRO", "Semáforo dañado en intersección de la 70",
         "Calle 70 con Av. Nutibara", 6.2400, -75.5850),
        ("ACCIDENTE", "Atropello en la Avenida El Poblado",
         "Av. El Poblado con Lleras", 6.2050, -75.5620),
    ]
    reportes = []
    for tipo, desc, ubi, lat, lng in reportes_data:
        r, _ = ReporteIncidente.objects.get_or_create(
            tipo=tipo, latitud=lat, longitud=lng,
            defaults=dict(usuario=choice([user, user2]), descripcion=desc,
                          ubicacion_texto=ubi, activo=True)
        )
        reportes.append(r)

    # ── VOTOS (RF-18) ──
    for reporte in reportes[:3]:
        VotoReporte.objects.get_or_create(usuario=user, reporte=reporte, defaults={"positivo": True})
        VotoReporte.objects.get_or_create(usuario=user2, reporte=reporte, defaults={"positivo": choice([True, False])})

    # ── FAVORITOS (RF-13) ──
    favoritos_data = [
        ("Casa", "Cra 42 # 20-15, Medellín", 6.2150, -75.5600),
        ("Trabajo", "Calle 10 # 40-20, El Poblado", 6.2000, -75.5650),
        ("Universidad", "Av. 70 # 80-10, Laureles", 6.2350, -75.5900),
    ]
    for nombre, dir, lat, lng in favoritos_data:
        Favorito.objects.get_or_create(usuario=user, nombre=nombre,
                                        defaults=dict(direccion=dir, latitud=lat, longitud=lng))

    # ── CONTACTOS DE EMERGENCIA (RF-14) ──
    ContactoEmergencia.objects.get_or_create(
        usuario=user, nombre="Ana López",
        defaults=dict(telefono="3001234567", email="ana@test.com")
    )
    ContactoEmergencia.objects.get_or_create(
        usuario=user, nombre="Pedro Pérez",
        defaults=dict(telefono="3007654321", email="pedro@test.com")
    )

    # ── EVENTOS SOS (RF-14, CU-03) ──
    EventoSOS.objects.get_or_create(
        usuario=user, latitud=6.2100, longitud=-75.5600,
        defaults=dict(activo=False, contactos_notificados=[
            {"nombre": "Ana López", "telefono": "3001234567"},
            {"nombre": "Pedro Pérez", "telefono": "3007654321"}
        ])
    )

    # ── ALERTAS DE RIESGO (RF-08, CU-04) ──
    zona_roja = ZonaRiesgo.objects.filter(nivel__in=["ALTO", "CRITICO"]).first()
    if zona_roja:
        mensajes = [
            (f"Alerta: Ingresando a {zona_roja.nombre} - Nivel {zona_roja.get_nivel_display()}", zona_roja.nivel),
            ("Precaución: Zona con reportes recientes de hurtos", "MEDIO"),
            ("Clima adverso: Lluvias fuertes en el sector de San Javier", "ALTO"),
            ("Accidente reportado en la Av. Regional, considere ruta alterna", "MEDIO"),
            ("Manifestación en el Centro - Tome vías alternas", "ALTO"),
        ]
        for mensaje, nivel in mensajes:
            Alerta.objects.get_or_create(
                usuario=user, mensaje=mensaje,
                defaults=dict(zona_riesgo=zona_roja, nivel=nivel, leida=choice([True, False]))
            )

    # ── HISTORIAL DE VIAJES (RF-07) ──
    for i in range(5):
        fecha = date.today() - timedelta(days=i + 1)
        ln = choice(lineas)
        HistorialViaje.objects.get_or_create(
            usuario=user, origen_nombre=ln.nombre, destino_nombre=choice(lineas).nombre, creado__date=fecha,
            defaults=dict(origen_lat=6.2300, origen_lng=-75.5800,
                          destino_lat=6.2000, destino_lng=-75.5600,
                          distancia_km=randint(5, 50), tiempo_min=randint(15, 90))
        )

    # ════════════════════════════════════════════
    # REPORTE FINAL
    # ════════════════════════════════════════════
    print("Seed completado con datos de Medellin:")
    print(f"  Categorías de riesgo: {CategoriaRiesgo.objects.count()}")
    print(f"  Zonas de riesgo: {ZonaRiesgo.objects.count()}")
    print(f"  Eventos de riesgo: {EventoRiesgo.objects.count()}")
    print(f"  Reportes: {ReporteIncidente.objects.count()}")
    print(f"  Líneas de transporte: {LineaTransporte.objects.count()}")
    print(f"  Paradas: {Parada.objects.count()}")
    print(f"  Contactos de emergencia: {ContactoEmergencia.objects.count()}")
    print(f"  Eventos SOS: {EventoSOS.objects.count()}")
    print(f"  Alertas: {Alerta.objects.count()}")
    print(f"  Favoritos: {Favorito.objects.count()}")
    print(f"  Historial de viajes: {HistorialViaje.objects.count()}")


if __name__ == "__main__":
    run()
