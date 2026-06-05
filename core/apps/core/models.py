from django.db import models


class ZonaRiesgo(models.Model):
    TIPOS_RIESGO = [
        ("ACCIDENTE", "Accidente"), ("VIOLENCIA", "Violencia"),
        ("ROBO", "Robo"), ("INUNDACION", "Inundación"),
        ("DESLIZAMIENTO", "Deslizamiento"), ("OTRO", "Otro"),
    ]
    NIVELES = [
        ("BAJO", "Bajo"), ("MEDIO", "Medio"),
        ("ALTO", "Alto"), ("CRITICO", "Crítico"),
    ]
    nombre = models.CharField(max_length=200)
    comuna = models.CharField(max_length=100, blank=True)
    descripcion = models.TextField(blank=True)
    tipo_riesgo = models.CharField(max_length=30, choices=TIPOS_RIESGO, default="OTRO")
    nivel = models.CharField(max_length=20, choices=NIVELES, default="MEDIO")
    latitud = models.FloatField()
    longitud = models.FloatField()
    radio_metros = models.IntegerField(default=500)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Zonas de Riesgo"
        app_label = "core"


class ReporteIncidente(models.Model):
    TIPOS = [
        ("accidente", "Accidente"), ("bloqueo", "Bloqueo"),
        ("zona_peligrosa", "Zona Peligrosa"), ("robo", "Robo"),
        ("clima", "Riesgo Climático"), ("otro", "Otro"),
    ]
    ESTADOS = [
        ("pendiente", "Pendiente"), ("aprobado", "Aprobado"), ("oculto", "Oculto"),
    ]
    tipo = models.CharField(max_length=30, choices=TIPOS)
    descripcion = models.TextField()
    ubicacion = models.CharField(max_length=255)
    latitud = models.FloatField()
    longitud = models.FloatField()
    estado = models.CharField(max_length=20, choices=ESTADOS, default="pendiente")
    activo = models.BooleanField(default=True)
    votos_positivos = models.IntegerField(default=0)
    votos_negativos = models.IntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Reportes de Incidentes"
        ordering = ["-creado"]
        app_label = "core"


class EventoRiesgo(models.Model):
    TIPOS = [
        ("inundacion", "Inundación"), ("deslizamiento", "Deslizamiento"),
        ("incendio", "Incendio"), ("sismo", "Sismo"),
        ("accidente_vial", "Accidente Vial"), ("explosion", "Explosión"),
        ("fuga_gas", "Fuga de Gas"), ("colapso", "Colapso Estructural"),
        ("vendaval", "Vendaval"), ("otro", "Otro"),
    ]
    NIVELES = [
        ("bajo", "Bajo"), ("medio", "Medio"),
        ("alto", "Alto"), ("critico", "Crítico"),
    ]
    tipo = models.CharField(max_length=30, choices=TIPOS)
    nivel = models.CharField(max_length=20, choices=NIVELES, default="medio")
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True)
    latitud = models.FloatField()
    longitud = models.FloatField()
    radio_impacto_metros = models.IntegerField(default=300)
    activo = models.BooleanField(default=True)
    expira_en = models.DateTimeField(null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Eventos de Riesgo"
        app_label = "core"
