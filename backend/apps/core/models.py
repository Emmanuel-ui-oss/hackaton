from django.db import models
from django.conf import settings


class CategoriaRiesgo(models.Model):
    NIVELES = [
        ("bajo", "Bajo"),
        ("medio", "Medio"),
        ("alto", "Alto"),
        ("critico", "Crítico"),
    ]
    nombre = models.CharField(max_length=100)
    nivel = models.CharField(max_length=20, choices=NIVELES, default="medio")
    color = models.CharField(max_length=7, default="#FFA500")
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categorías de Riesgo"

    def __str__(self):
        return f"{self.nombre} ({self.get_nivel_display()})"


class ZonaRiesgo(models.Model):
    TIPOS_RIESGO = [
        ("ACCIDENTE", "Accidente"),
        ("VIOLENCIA", "Violencia"),
        ("ROBO", "Robo"),
        ("INUNDACION", "Inundación"),
        ("DESLIZAMIENTO", "Deslizamiento"),
        ("OTRO", "Otro"),
    ]
    NIVELES = [
        ("BAJO", "Bajo"),
        ("MEDIO", "Medio"),
        ("ALTO", "Alto"),
        ("CRITICO", "Crítico"),
    ]
    nombre = models.CharField(max_length=200)
    comuna = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField(blank=True)
    tipo_riesgo = models.CharField(max_length=30, choices=TIPOS_RIESGO, default="OTRO")
    nivel = models.CharField(max_length=20, choices=NIVELES, default="MEDIO")
    categoria = models.ForeignKey(
        CategoriaRiesgo, on_delete=models.CASCADE, related_name="zonas", null=True, blank=True
    )
    latitud = models.FloatField(db_index=True)
    longitud = models.FloatField(db_index=True)
    radio_metros = models.IntegerField(default=500)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Zonas de Riesgo"

    def __str__(self):
        return self.nombre

    def get_nivel_display(self):
        return dict(self.NIVELES).get(self.nivel, self.nivel)


class ReporteIncidente(models.Model):
    TIPOS = [
        ("accidente", "Accidente"),
        ("bloqueo", "Bloqueo"),
        ("zona_peligrosa", "Zona Peligrosa"),
        ("robo", "Robo"),
        ("clima", "Riesgo Climático"),
        ("otro", "Otro"),
    ]
    TIPOS_ALT = [
        ("ACCIDENTE", "Accidente"),
        ("BLOQUEO", "Bloqueo"),
        ("ZONA_PELIGROSA", "Zona Peligrosa"),
        ("ROBO", "Robo"),
        ("INUNDACION", "Inundación"),
        ("DESLIZAMIENTO", "Deslizamiento"),
        ("MANIFESTACION", "Manifestación"),
        ("OTRO", "Otro"),
    ]
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobado", "Aprobado"),
        ("oculto", "Oculto"),
    ]
    tipo = models.CharField(max_length=30, choices=TIPOS)
    descripcion = models.TextField()
    ubicacion = models.CharField(max_length=255)
    ubicacion_texto = models.CharField(max_length=255, blank=True)
    latitud = models.FloatField(db_index=True)
    longitud = models.FloatField(db_index=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reportes"
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    activo = models.BooleanField(default=True)
    votos_positivos = models.IntegerField(default=0)
    votos_negativos = models.IntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Reportes de Incidentes"
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.usuario.username}"


class VotoReporte(models.Model):
    VOTOS = [
        ("positivo", "Validar"),
        ("negativo", "Desmentir"),
    ]
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="votos"
    )
    reporte = models.ForeignKey(
        ReporteIncidente, on_delete=models.CASCADE, related_name="votos"
    )
    voto = models.CharField(max_length=20, choices=VOTOS)
    positivo = models.BooleanField(null=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("usuario", "reporte")

    def __str__(self):
        return f"{self.usuario.username} - {self.get_voto_display()}"


class ContactoEmergencia(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contactos_emergencia"
    )
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    relacion = models.CharField(max_length=50, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Contactos de Emergencia"

    def __str__(self):
        return f"{self.nombre} ({self.telefono})"


class PerfilUsuario(models.Model):
    usuario = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name="perfil"
    )
    telefono = models.CharField(max_length=20, blank=True, default="")

    def __str__(self):
        return f"Perfil de {self.usuario.username}"


class EventoRiesgo(models.Model):
    TIPOS = [
        ("inundacion", "Inundación"),
        ("deslizamiento", "Deslizamiento"),
        ("incendio", "Incendio"),
        ("sismo", "Sismo"),
        ("accidente_vial", "Accidente Vial"),
        ("explosion", "Explosión"),
        ("fuga_gas", "Fuga de Gas"),
        ("colapso", "Colapso Estructural"),
        ("vendaval", "Vendaval"),
        ("otro", "Otro"),
    ]
    NIVELES = [
        ("bajo", "Bajo"),
        ("medio", "Medio"),
        ("alto", "Alto"),
        ("critico", "Crítico"),
    ]
    FUENTES = [
        ("simur", "SIMUR"),
        ("dagrd", "DAGRD"),
        ("usuario", "Reporte Usuario"),
        ("api_externa", "API Externa"),
    ]

    tipo = models.CharField(max_length=30, choices=TIPOS)
    nivel = models.CharField(max_length=20, choices=NIVELES, default="medio")
    fuente = models.CharField(max_length=30, choices=FUENTES, default="usuario")
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    latitud = models.FloatField()
    longitud = models.FloatField()
    radio_impacto_metros = models.IntegerField(default=300)
    activo = models.BooleanField(default=True)
    expira_en = models.DateTimeField(null=True, blank=True)
    datos_raw = models.JSONField(blank=True, default=dict)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Eventos de Riesgo"
        ordering = ["-creado"]
        indexes = [
            models.Index(fields=["latitud", "longitud"]),
            models.Index(fields=["activo", "expira_en"]),
        ]

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.nivel} - {self.titulo[:50]}"


class LogAuditoria(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    accion = models.CharField(max_length=50)
    modelo = models.CharField(max_length=100)
    id_objeto = models.IntegerField(null=True, blank=True)
    detalles = models.JSONField(blank=True, default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Logs de Auditoría"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.accion} - {self.modelo} - {self.timestamp}"


class Alerta(models.Model):
    NIVELES = [
        ("BAJO", "Bajo"),
        ("MEDIO", "Medio"),
        ("ALTO", "Alto"),
        ("CRITICO", "Crítico"),
    ]
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alertas"
    )
    zona_riesgo = models.ForeignKey(
        "ZonaRiesgo", on_delete=models.SET_NULL, null=True, blank=True, related_name="alertas"
    )
    mensaje = models.TextField()
    nivel = models.CharField(max_length=20, choices=NIVELES, default="MEDIO")
    leida = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Alertas"
        ordering = ["-creado"]

    def __str__(self):
        return f"[{self.get_nivel_display()}] {self.mensaje[:60]}"


class Favorito(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favoritos"
    )
    nombre = models.CharField(max_length=100)
    direccion = models.CharField(max_length=255, blank=True)
    latitud = models.FloatField()
    longitud = models.FloatField()
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Favoritos"

    def __str__(self):
        return f"{self.nombre} - {self.usuario.username}"


class EventoSOS(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="eventos_sos"
    )
    latitud = models.FloatField()
    longitud = models.FloatField()
    activo = models.BooleanField(default=True)
    contactos_notificados = models.JSONField(blank=True, default=list)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Eventos SOS"
        ordering = ["-creado"]

    def __str__(self):
        return f"SOS - {self.usuario.username} ({self.creado})"


class RutaTransporte(models.Model):
    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=50)
    codigo = models.CharField(max_length=20, unique=True)
    color = models.CharField(max_length=7, default="#00c853")
    ruta_geojson = models.JSONField()
    paradas = models.JSONField(default=list)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Ruta de Transporte"
        verbose_name_plural = "Rutas de Transporte"

    def __str__(self):
        return f"{self.nombre} ({self.codigo})"


class Testimonial(models.Model):
    nombre = models.CharField(max_length=100)
    rol = models.CharField(max_length=100)
    contenido = models.TextField()
    avatar_url = models.URLField(blank=True)
    calificacion = models.IntegerField(default=5)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Testimonios"
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.nombre} - {self.rol}"


class HistorialViaje(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="historial_viajes"
    )
    origen_nombre = models.CharField(max_length=200)
    destino_nombre = models.CharField(max_length=200)
    origen_lat = models.FloatField(null=True, blank=True)
    origen_lng = models.FloatField(null=True, blank=True)
    destino_lat = models.FloatField(null=True, blank=True)
    destino_lng = models.FloatField(null=True, blank=True)
    distancia_km = models.FloatField(null=True, blank=True)
    tiempo_min = models.IntegerField(null=True, blank=True)
    costo_estimado = models.IntegerField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Historial de Viajes"
        ordering = ["-creado"]

    def __str__(self):
        return f"{self.origen_nombre} → {self.destino_nombre} ({self.usuario.username})"


class IncidenteHomicidio(models.Model):
    latitud = models.FloatField()
    longitud = models.FloatField()
    barrio = models.CharField(max_length=200, blank=True)
    comuna = models.CharField(max_length=100, blank=True)
    anio = models.IntegerField(null=True, blank=True)
    fuente = models.CharField(max_length=100, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Incidentes de Homicidio"
        indexes = [
            models.Index(fields=["latitud", "longitud"]),
        ]

    def __str__(self):
        return f"Homicidio en {self.barrio or 'N/A'} ({self.latitud}, {self.longitud})"


class IncidenteTransito(models.Model):
    latitud = models.FloatField()
    longitud = models.FloatField()
    tipo = models.CharField(max_length=100, blank=True)
    gravedad = models.CharField(max_length=50, blank=True)
    comuna = models.CharField(max_length=100, blank=True)
    anio = models.IntegerField(null=True, blank=True)
    fuente = models.CharField(max_length=100, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Incidentes de Tránsito"
        indexes = [
            models.Index(fields=["latitud", "longitud"]),
        ]

    def __str__(self):
        return f"Incidente tránsito en ({self.latitud}, {self.longitud})"


class EstacionPolicia(models.Model):
    nombre = models.CharField(max_length=200)
    direccion = models.CharField(max_length=255, blank=True)
    latitud = models.FloatField()
    longitud = models.FloatField()
    telefono = models.CharField(max_length=50, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Estaciones de Policía"
        indexes = [
            models.Index(fields=["latitud", "longitud"]),
        ]

    def __str__(self):
        return self.nombre
