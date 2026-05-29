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
    nombre = models.CharField(max_length=200)
    comuna = models.CharField(max_length=100, blank=True)
    categoria = models.ForeignKey(
        CategoriaRiesgo, on_delete=models.CASCADE, related_name="zonas"
    )
    latitud = models.FloatField()
    longitud = models.FloatField()
    radio_metros = models.IntegerField(default=500)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Zonas de Riesgo"

    def __str__(self):
        return self.nombre


class ReporteIncidente(models.Model):
    TIPOS = [
        ("accidente", "Accidente"),
        ("bloqueo", "Bloqueo"),
        ("zona_peligrosa", "Zona Peligrosa"),
        ("robo", "Robo"),
        ("clima", "Riesgo Climático"),
        ("otro", "Otro"),
    ]
    ESTADOS = [
        ("pendiente", "Pendiente"),
        ("aprobado", "Aprobado"),
        ("oculto", "Oculto"),
    ]
    tipo = models.CharField(max_length=30, choices=TIPOS)
    descripcion = models.TextField()
    ubicacion = models.CharField(max_length=255)
    latitud = models.FloatField()
    longitud = models.FloatField()
    foto = models.ImageField(upload_to="incidentes/", blank=True, null=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reportes"
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
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
    relacion = models.CharField(max_length=50, blank=True)
    activo = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Contactos de Emergencia"

    def __str__(self):
        return f"{self.nombre} ({self.telefono})"


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
