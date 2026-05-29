import os, django
from datetime import date, timedelta, time
from random import choice, randint

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth.models import User
from apps.core.models import (
    Categoria, Vehiculo, Conductor, Ruta, Item, Incidente, Poliza, Comentario, MatrizRiesgo,
    ZonaRiesgo, ReporteIncidenteComunitario, VotoReporte,
    Favorito, ContactoEmergencia, EventoSOS,
    LineaTransporte, Parada, HorarioTransporte,
    Alerta, HistorialViaje,
)


def run():
    print("Creando seed data...")

    if User.objects.filter(username="admin").exists():
        print("Ya hay datos cargados. Omitiendo seed.")
        return

    # ── USUARIOS ──
    User.objects.create_superuser("admin", "admin@test.com", "admin123")
    user, _ = User.objects.get_or_create(username="demo", defaults={"email": "demo@test.com"})
    user.set_password("demo123")
    user.save()
    user2, _ = User.objects.get_or_create(username="maria", defaults={"email": "maria@test.com"})
    user2.set_password("maria123")
    user2.save()

    # ── MODELOS DE LOGÍSTICA ──
    cats = []
    for n in ["Electrónicos", "Alimentos", "Materiales peligrosos", "Ropa", "Maquinaria"]:
        c, _ = Categoria.objects.get_or_create(nombre=n, defaults={"descripcion": f"Categoría {n}"})
        cats.append(c)

    vehiculos_data = [
        ("ABC123", "Toyota", "Hilux", 2022, "CAMIONETA", 1200),
        ("DEF456", "Volvo", "FH16", 2021, "TRACTO", 25000),
        ("GHI789", "Mercedes", "Actros", 2023, "CAMION", 18000),
        ("JKL012", "Nissan", "NP300", 2020, "CAMIONETA", 1000),
        ("MNO345", "Kenworth", "T680", 2022, "TRACTO", 28000),
    ]
    vehs = []
    for placa, marca, mod, año, tipo, cap in vehiculos_data:
        v, _ = Vehiculo.objects.get_or_create(
            placa=placa,
            defaults=dict(marca=marca, modelo=mod, año=año, tipo=tipo,
                          capacidad_kg=cap, categoria=choice(cats))
        )
        vehs.append(v)

    conductores_data = [
        ("Carlos Pérez", "CC101", "A1", "3001112233"),
        ("María López", "CC102", "A2", "3001112244"),
        ("Juan García", "CC103", "B1", "3001112255"),
    ]
    conds = []
    for nom, doc, lic, tel in conductores_data:
        c, _ = Conductor.objects.get_or_create(
            documento=doc,
            defaults=dict(nombre=nom, licencia=lic, telefono=tel, email=f"{nom.split()[0].lower()}@test.com")
        )
        conds.append(c)

    rutas_interurbanas = [
        ("Bogotá", "Medellín", "Santa Fe", "La Candelaria", 420, 480, "ALTO", False),
        ("Bogotá", "Cali", "Usaquén", "Comuna 2", 510, 540, "ALTO", False),
        ("Medellín", "Barranquilla", "La Candelaria", "Riomar", 710, 720, "MEDIO", False),
        ("Medellín", "Cali", "La Candelaria", "Comuna 2", 480, 480, "MEDIO", False),
    ]
    rutas = []
    for org, dst, com_org, com_dst, dist, t, riesgo, acc in rutas_interurbanas:
        r, _ = Ruta.objects.get_or_create(
            origen=org, destino=dst,
            defaults=dict(comuna_origen=com_org, comuna_destino=com_dst,
                          distancia_km=dist, tiempo_estimado_min=t,
                          nivel_riesgo=riesgo, accesible=acc)
        )
        rutas.append(r)

    # Rutas urbanas Medellín
    rutas_urbanas = [
        ("Estadio", "Poblado", "Estadio", "El Poblado", 12, 35, "MEDIO", True),
        ("Centro", "Aranjuez", "La Candelaria", "Aranjuez", 8, 25, "BAJO", True),
        ("Bello", "Envigado", "Bello", "Envigado", 25, 60, "ALTO", False),
        ("Robledo", "Buenos Aires", "Robledo", "Buenos Aires", 15, 40, "MEDIO", True),
    ]
    for org, dst, com_org, com_dst, dist, t, riesgo, acc in rutas_urbanas:
        r, _ = Ruta.objects.get_or_create(
            origen=org, destino=dst,
            defaults=dict(comuna_origen=com_org, comuna_destino=com_dst,
                          distancia_km=dist, tiempo_estimado_min=t,
                          nivel_riesgo=riesgo, accesible=acc)
        )
        rutas.append(r)

    for i in range(10):
        cod = f"ENV-{i+1:04d}"
        item, _ = Item.objects.get_or_create(
            codigo=cod,
            defaults=dict(
                descripcion=f"Envío de prueba #{i+1}",
                valor=randint(100000, 5000000),
                peso_kg=randint(50, 2000),
                estado=choice([e[0] for e in Item.Estado.choices]),
                origen=choice(rutas).origen,
                destino=choice(rutas).destino,
                categoria=choice(cats),
                vehiculo=choice(vehs),
                conductor=choice(conds),
                ruta=choice(rutas),
                creado_por=user,
            )
        )

    for item in Item.objects.all():
        if choice([True, False]):
            Incidente.objects.get_or_create(
                tipo=choice([t[0] for t in Incidente.Tipo.choices]),
                item=item,
                fecha=date.today() - timedelta(days=randint(1, 60)),
                defaults=dict(
                    descripcion=f"Incidente registrado para {item.codigo}",
                    ubicacion=f"Km {randint(10, 1000)}",
                    costo_danos=randint(0, 2000000) if choice([True, False]) else None,
                )
            )

    for _ in range(3):
        v = choice(vehs)
        Poliza.objects.get_or_create(
            numero=f"POL-{randint(1000,9999)}",
            defaults=dict(
                tipo=choice([t[0] for t in Poliza.Tipo.choices]),
                aseguradora=choice(["Sura", "Mapfre", "Allianz", "Bolívar", "Previsora"]),
                cobertura="Cobertura completa según póliza",
                prima=randint(50000, 500000),
                vigencia_desde=date.today(),
                vigencia_hasta=date.today() + timedelta(days=365),
                vehiculo=v,
            )
        )

    for ruta in rutas:
        for factor, prob, imp in [
            ("CLIMA", randint(2, 4), randint(2, 4)),
            ("VIA", randint(1, 4), randint(2, 5)),
            ("SINIESTRO", randint(1, 3), randint(1, 4)),
            ("TRAFICO", randint(2, 4), randint(2, 4)),
            ("GEO", randint(1, 3), randint(1, 3)),
        ]:
            MatrizRiesgo.objects.get_or_create(
                ruta=ruta, factor=factor,
                defaults=dict(probabilidad=prob, impacto=imp,
                              mitigacion=f"Mitigación para {factor} en ruta {ruta.origen}→{ruta.destino}")
            )

    for item in Item.objects.all()[:5]:
        Comentario.objects.get_or_create(
            contenido=f"Seguimiento de {item.codigo} completado sin novedades.",
            autor=user,
            item=item,
        )

    # ════════════════════════════════════════════
    # DATOS DE MEDELLÍN (Requisitos del documento)
    # ════════════════════════════════════════════

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
            for i, (nombre, lat, lng, orden) in enumerate(paradas_data[linea.codigo]):
                Parada.objects.get_or_create(
                    linea=linea, orden=orden,
                    defaults=dict(nombre=nombre, direccion=f"Estación {nombre}, Medellín",
                                  latitud=lat, longitud=lng)
                )

    # ── HORARIOS ──
    for linea in lineas[:3]:
        for dia in range(1, 8):
            if dia == 7:
                hi, hf, freq = time(8, 0), time(22, 0), 15
            elif dia == 6:
                hi, hf, freq = time(6, 0), time(23, 0), 12
            else:
                hi, hf, freq = time(5, 0), time(23, 0), 10
            HorarioTransporte.objects.get_or_create(
                linea=linea, dia_semana=dia, hora_inicio=hi,
                defaults=dict(hora_fin=hf, frecuencia_min=freq)
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
        r, _ = ReporteIncidenteComunitario.objects.get_or_create(
            tipo=tipo, latitud=lat, longitud=lng,
            defaults=dict(usuario=choice([user, user2]), descripcion=desc,
                          ubicacion_texto=ubi)
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
        ruta = choice(rutas)
        HistorialViaje.objects.get_or_create(
            usuario=user, origen_nombre=ruta.origen, destino_nombre=ruta.destino, creado__date=fecha,
            defaults=dict(origen_lat=6.2300, origen_lng=-75.5800,
                          destino_lat=6.2000, destino_lng=-75.5600,
                          distancia_km=ruta.distancia_km, tiempo_min=ruta.tiempo_estimado_min,
                          ruta=ruta, costo_estimado=randint(5000, 50000))
        )

    # ════════════════════════════════════════════
    # REPORTE FINAL
    # ════════════════════════════════════════════
    print("Seed completado con datos de Medellin:")
    print(f"  Logistica: {Categoria.objects.count()} cat, {Vehiculo.objects.count()} veh, "
          f"{Conductor.objects.count()} cond, {Ruta.objects.count()} rutas, "
          f"{Item.objects.count()} envios, {MatrizRiesgo.objects.count()} riesgos")
    print(f"  Medellin: {ZonaRiesgo.objects.count()} zonas de riesgo, "
          f"{ReporteIncidenteComunitario.objects.count()} reportes, "
          f"{LineaTransporte.objects.count()} lineas, {Parada.objects.count()} paradas")
    print(f"  Seguridad: {ContactoEmergencia.objects.count()} contactos, "
          f"{EventoSOS.objects.count()} eventos SOS, "
          f"{Alerta.objects.count()} alertas, {Favorito.objects.count()} favoritos")
    print(f"  Historial: {HistorialViaje.objects.count()} viajes registrados")


if __name__ == "__main__":
    run()
