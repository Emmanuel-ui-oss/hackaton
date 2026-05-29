from django.db import models
from django.contrib.auth.models import User


class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Categorías"

    def __str__(self):
        return self.nombre


class Vehiculo(models.Model):
    class Tipo(models.TextChoices):
        CAMION = "CAMION", "Camión"
        CAMIONETA = "CAMIONETA", "Camioneta"
        TRACTO = "TRACTO", "Tractocamión"
        FURGON = "FURGON", "Furgón"
        MOTO = "MOTO", "Motocicleta"

    class Estado(models.TextChoices):
        ACTIVO = "ACTIVO", "Activo"
        MANTENIMIENTO = "MANTENIMIENTO", "En mantenimiento"
        INACTIVO = "INACTIVO", "Inactivo"

    placa = models.CharField(max_length=10, unique=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    año = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    capacidad_kg = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=20, choices=Estado.choices, default=Estado.ACTIVO)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.placa} - {self.marca} {self.modelo}"


class Conductor(models.Model):
    nombre = models.CharField(max_length=150)
    documento = models.CharField(max_length=20, unique=True)
    licencia = models.CharField(max_length=30)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    activo = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Conductores"

    def __str__(self):
        return f"{self.nombre} ({self.documento})"


class Ruta(models.Model):
    class NivelRiesgo(models.TextChoices):
        BAJO = "BAJO", "Bajo"
        MEDIO = "MEDIO", "Medio"
        ALTO = "ALTO", "Alto"
        CRITICO = "CRITICO", "Crítico"

    origen = models.CharField(max_length=200)
    destino = models.CharField(max_length=200)
    comuna_origen = models.CharField(max_length=100, blank=True, help_text="Comuna de origen en Medellín")
    comuna_destino = models.CharField(max_length=100, blank=True, help_text="Comuna de destino en Medellín")
    distancia_km = models.DecimalField(max_digits=8, decimal_places=2)
    tiempo_estimado_min = models.IntegerField()
    nivel_riesgo = models.CharField(max_length=10, choices=NivelRiesgo.choices, default=NivelRiesgo.MEDIO)
    accesible = models.BooleanField(default=False, help_text="Ruta accesible para movilidad reducida")
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Rutas"

    def __str__(self):
        return f"{self.origen} → {self.destino}"


class Item(models.Model):
    class Estado(models.TextChoices):
        PENDIENTE = "PENDIENTE", "Pendiente"
        EN_TRANSITO = "TRANSITO", "En tránsito"
        ENTREGADO = "ENTREGADO", "Entregado"
        RETRASADO = "RETRASADO", "Retrasado"
        PERDIDO = "PERDIDO", "Perdido"
        CANCELADO = "CANCELADO", "Cancelado"

    codigo = models.CharField(max_length=30, unique=True)
    descripcion = models.TextField()
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    peso_kg = models.DecimalField(max_digits=10, decimal_places=2)
    estado = models.CharField(max_length=15, choices=Estado.choices, default=Estado.PENDIENTE)
    origen = models.CharField(max_length=200, blank=True)
    destino = models.CharField(max_length=200, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.SET_NULL, null=True, blank=True)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)
    conductor = models.ForeignKey(Conductor, on_delete=models.SET_NULL, null=True, blank=True)
    ruta = models.ForeignKey(Ruta, on_delete=models.SET_NULL, null=True, blank=True)
    creado_por = models.ForeignKey(User, on_delete=models.CASCADE)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.codigo} - {self.descripcion[:50]}"


class Incidente(models.Model):
    class Tipo(models.TextChoices):
        ACCIDENTE = "ACCIDENTE", "Accidente"
        ROBO = "ROBO", "Robo"
        AVERIA = "AVERIA", "Avería mecánica"
        RETRASO = "RETRASO", "Retraso"
        CLIMA = "CLIMA", "Clima adverso"
        OTRO = "OTRO", "Otro"

    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    descripcion = models.TextField()
    fecha = models.DateTimeField()
    ubicacion = models.CharField(max_length=200, blank=True)
    costo_danos = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="incidentes")
    reportado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.fecha.date()}"


class Poliza(models.Model):
    class Tipo(models.TextChoices):
        VEHICULO = "VEHICULO", "Vehículo"
        CARGA = "CARGA", "Carga"
        CONDUCTOR = "CONDUCTOR", "Conductor"
        RESPONSABILIDAD = "RESP_CIVIL", "Responsabilidad Civil"

    numero = models.CharField(max_length=30, unique=True)
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    aseguradora = models.CharField(max_length=100)
    cobertura = models.TextField()
    prima = models.DecimalField(max_digits=12, decimal_places=2)
    vigencia_desde = models.DateField()
    vigencia_hasta = models.DateField()
    activa = models.BooleanField(default=True)
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    conductor = models.ForeignKey(Conductor, on_delete=models.SET_NULL, null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Pólizas"

    def __str__(self):
        return f"{self.numero} - {self.aseguradora}"


class Comentario(models.Model):
    contenido = models.TextField()
    autor = models.ForeignKey(User, on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name="comentarios")
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comentario de {self.autor.username} en {self.item.codigo}"


class MatrizRiesgo(models.Model):
    class Factor(models.TextChoices):
        CLIMA = "CLIMA", "Clima"
        ESTADO_VIA = "VIA", "Estado de la vía"
        SINIESTRALIDAD = "SINIESTRO", "Historial de siniestros"
        TRAFICO = "TRAFICO", "Tráfico"
        GEOGRAFIA = "GEO", "Geografía"

    class Nivel(models.TextChoices):
        BAJO = "BAJO", "Bajo"
        MEDIO = "MEDIO", "Medio"
        ALTO = "ALTO", "Alto"
        CRITICO = "CRITICO", "Crítico"

    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name="riesgos")
    factor = models.CharField(max_length=15, choices=Factor.choices)
    probabilidad = models.IntegerField(help_text="1-5")
    impacto = models.IntegerField(help_text="1-5")
    nivel = models.CharField(max_length=10, choices=Nivel.choices, editable=False)
    mitigacion = models.TextField(blank=True)

    class Meta:
        verbose_name_plural = "Matriz de riesgos"
        unique_together = ("ruta", "factor")

    def save(self, *args, **kwargs):
        puntaje = self.probabilidad * self.impacto
        if puntaje >= 20:
            self.nivel = self.Nivel.CRITICO
        elif puntaje >= 12:
            self.nivel = self.Nivel.ALTO
        elif puntaje >= 6:
            self.nivel = self.Nivel.MEDIO
        else:
            self.nivel = self.Nivel.BAJO
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.ruta} - {self.get_factor_display()}: {self.nivel}"


class ZonaRiesgo(models.Model):
    class TipoRiesgo(models.TextChoices):
        VIOLENCIA = "VIOLENCIA", "Violencia / Seguridad"
        INUNDACION = "INUNDACION", "Inundación"
        DESLIZAMIENTO = "DESLIZAMIENTO", "Deslizamiento"
        ACCIDENTE = "ACCIDENTE", "Accidentalidad vial"
        BLOQUEO = "BLOQUEO", "Bloqueo de vía"
        OTRO = "OTRO", "Otro"

    class Nivel(models.TextChoices):
        BAJO = "BAJO", "Bajo"
        MEDIO = "MEDIO", "Medio"
        ALTO = "ALTO", "Alto"
        CRITICO = "CRITICO", "Crítico"

    nombre = models.CharField(max_length=200)
    comuna = models.CharField(max_length=100, blank=True, help_text="Comuna de Medellín")
    descripcion = models.TextField()
    tipo_riesgo = models.CharField(max_length=20, choices=TipoRiesgo.choices)
    nivel = models.CharField(max_length=10, choices=Nivel.choices, default=Nivel.MEDIO)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    radio_metros = models.IntegerField(default=500, help_text="Radio de la zona de riesgo en metros")
    activa = models.BooleanField(default=True)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Zonas de riesgo"

    def __str__(self):
        return f"{self.nombre} ({self.get_nivel_display()}) - {self.comuna}"


class ReporteIncidenteComunitario(models.Model):
    class Tipo(models.TextChoices):
        ACCIDENTE = "ACCIDENTE", "Accidente de tránsito"
        BLOQUEO = "BLOQUEO", "Bloqueo de vía"
        ZONA_PELIGROSA = "ZONA_PELIGROSA", "Zona peligrosa"
        ROBO = "ROBO", "Robo / Hurto"
        INUNDACION = "INUNDACION", "Inundación"
        DESLIZAMIENTO = "DESLIZAMIENTO", "Deslizamiento"
        MANIFESTACION = "MANIFESTACION", "Manifestación"
        OTRO = "OTRO", "Otro"

    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reportes_comunitarios")
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    descripcion = models.TextField()
    ubicacion_texto = models.CharField(max_length=300, blank=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    foto_url = models.URLField(blank=True)
    activo = models.BooleanField(default=True)
    votos_positivos = models.IntegerField(default=0)
    votos_negativos = models.IntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Reporte comunitario"
        verbose_name_plural = "Reportes comunitarios"

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.usuario.username} - {self.creado.date()}"


class VotoReporte(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    reporte = models.ForeignKey(ReporteIncidenteComunitario, on_delete=models.CASCADE, related_name="votos")
    positivo = models.BooleanField()
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("usuario", "reporte")

    def __str__(self):
        return f"{'👍' if self.positivo else '👎'} {self.usuario.username} → {self.reporte}"


class Favorito(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="favoritos")
    nombre = models.CharField(max_length=150)
    direccion = models.CharField(max_length=300)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Favoritos"

    def __str__(self):
        return f"{self.nombre} - {self.usuario.username}"


class ContactoEmergencia(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="contactos_emergencia")
    nombre = models.CharField(max_length=150)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Contactos de emergencia"

    def __str__(self):
        return f"{self.nombre} ({self.telefono})"


class EventoSOS(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="eventos_sos")
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    activo = models.BooleanField(default=True)
    contactos_notificados = models.JSONField(default=list, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    cerrado = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Evento SOS"
        verbose_name_plural = "Eventos SOS"

    def __str__(self):
        return f"SOS {self.usuario.username} - {self.timestamp}"


class LineaTransporte(models.Model):
    class Tipo(models.TextChoices):
        METRO = "METRO", "Metro"
        METROPLUS = "METROPLUS", "Metroplús"
        TRANVIA = "TRANVIA", "Tranvía"
        CABLE = "CABLE", "Cable"
        BUS = "BUS", "Bus"

    nombre = models.CharField(max_length=100)
    tipo = models.CharField(max_length=15, choices=Tipo.choices)
    codigo = models.CharField(max_length=20, unique=True, help_text="Código de línea (ej: L1, M1, T1, K1)")
    color = models.CharField(max_length=20, blank=True, help_text="Color hexadecimal")
    descripcion = models.TextField(blank=True)
    activa = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Línea de transporte"
        verbose_name_plural = "Líneas de transporte"

    def __str__(self):
        return f"{self.codigo} - {self.nombre} ({self.get_tipo_display()})"


class Parada(models.Model):
    linea = models.ForeignKey(LineaTransporte, on_delete=models.CASCADE, related_name="paradas")
    nombre = models.CharField(max_length=200)
    direccion = models.CharField(max_length=300, blank=True)
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    orden = models.IntegerField()
    activa = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.linea.codigo} - {self.nombre} (parada #{self.orden})"


class HorarioTransporte(models.Model):
    class DiaSemana(models.IntegerChoices):
        LUNES = 1, "Lunes"
        MARTES = 2, "Martes"
        MIERCOLES = 3, "Miércoles"
        JUEVES = 4, "Jueves"
        VIERNES = 5, "Viernes"
        SABADO = 6, "Sábado"
        DOMINGO = 7, "Domingo"

    linea = models.ForeignKey(LineaTransporte, on_delete=models.CASCADE, related_name="horarios")
    dia_semana = models.IntegerField(choices=DiaSemana.choices)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    frecuencia_min = models.IntegerField(help_text="Frecuencia en minutos")

    class Meta:
        verbose_name_plural = "Horarios de transporte"
        ordering = ["linea", "dia_semana", "hora_inicio"]

    def __str__(self):
        return f"{self.linea.codigo} - {self.get_dia_semana_display()}: {self.hora_inicio}-{self.hora_fin}"


class Alerta(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="alertas")
    zona_riesgo = models.ForeignKey(ZonaRiesgo, on_delete=models.SET_NULL, null=True, blank=True)
    mensaje = models.TextField()
    nivel = models.CharField(max_length=10, choices=ZonaRiesgo.Nivel.choices)
    leida = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alerta {self.nivel} para {self.usuario.username}: {self.mensaje[:50]}"


class HistorialViaje(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE, related_name="historial_viajes")
    origen_nombre = models.CharField(max_length=300)
    destino_nombre = models.CharField(max_length=300)
    origen_lat = models.DecimalField(max_digits=9, decimal_places=6)
    origen_lng = models.DecimalField(max_digits=9, decimal_places=6)
    destino_lat = models.DecimalField(max_digits=9, decimal_places=6)
    destino_lng = models.DecimalField(max_digits=9, decimal_places=6)
    distancia_km = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tiempo_min = models.IntegerField(null=True, blank=True)
    ruta = models.ForeignKey(Ruta, on_delete=models.SET_NULL, null=True, blank=True)
    costo_estimado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Historial de viajes"
        ordering = ["-creado"]
