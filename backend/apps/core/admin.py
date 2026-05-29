from django.contrib import admin
from .models import (
    Categoria, Vehiculo, Conductor, Ruta, Item, Incidente, Poliza,
    Comentario, MatrizRiesgo, ZonaRiesgo, ReporteIncidenteComunitario,
    VotoReporte, Favorito, ContactoEmergencia, EventoSOS,
    LineaTransporte, Parada, HorarioTransporte, Alerta, HistorialViaje,
)


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "descripcion"]
    search_fields = ["nombre"]


@admin.register(Vehiculo)
class VehiculoAdmin(admin.ModelAdmin):
    list_display = ["placa", "marca", "modelo", "tipo", "estado", "año"]
    list_filter = ["tipo", "estado", "marca"]
    search_fields = ["placa", "marca"]


@admin.register(Conductor)
class ConductorAdmin(admin.ModelAdmin):
    list_display = ["nombre", "documento", "licencia", "telefono", "activo"]
    list_filter = ["activo"]
    search_fields = ["nombre", "documento"]


@admin.register(Ruta)
class RutaAdmin(admin.ModelAdmin):
    list_display = ["origen", "destino", "comuna_origen", "comuna_destino", "nivel_riesgo", "accesible"]
    list_filter = ["nivel_riesgo", "accesible"]
    search_fields = ["origen", "destino"]


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ["codigo", "descripcion", "estado", "valor", "creado_por", "creado"]
    list_filter = ["estado", "categoria"]
    search_fields = ["codigo", "descripcion"]
    date_hierarchy = "creado"


@admin.register(Incidente)
class IncidenteAdmin(admin.ModelAdmin):
    list_display = ["tipo", "fecha", "item", "costo_danos", "reportado_por"]
    list_filter = ["tipo"]
    date_hierarchy = "fecha"


@admin.register(Poliza)
class PolizaAdmin(admin.ModelAdmin):
    list_display = ["numero", "tipo", "aseguradora", "prima", "activa", "vigencia_desde", "vigencia_hasta"]
    list_filter = ["tipo", "activa", "aseguradora"]


@admin.register(Comentario)
class ComentarioAdmin(admin.ModelAdmin):
    list_display = ["contenido", "autor", "item", "creado"]
    date_hierarchy = "creado"


@admin.register(MatrizRiesgo)
class MatrizRiesgoAdmin(admin.ModelAdmin):
    list_display = ["ruta", "factor", "probabilidad", "impacto", "nivel"]
    list_filter = ["factor", "nivel"]


@admin.register(ZonaRiesgo)
class ZonaRiesgoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "comuna", "tipo_riesgo", "nivel", "activa"]
    list_filter = ["tipo_riesgo", "nivel", "comuna"]
    search_fields = ["nombre", "comuna"]


@admin.register(ReporteIncidenteComunitario)
class ReporteIncidenteComunitarioAdmin(admin.ModelAdmin):
    list_display = ["tipo", "usuario", "activo", "votos_positivos", "votos_negativos", "creado"]
    list_filter = ["tipo", "activo"]
    date_hierarchy = "creado"


@admin.register(VotoReporte)
class VotoReporteAdmin(admin.ModelAdmin):
    list_display = ["usuario", "reporte", "positivo"]
    list_filter = ["positivo"]


@admin.register(Favorito)
class FavoritoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "usuario", "direccion"]
    search_fields = ["nombre"]


@admin.register(ContactoEmergencia)
class ContactoEmergenciaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "usuario", "telefono", "email"]


@admin.register(EventoSOS)
class EventoSOSAdmin(admin.ModelAdmin):
    list_display = ["usuario", "activo", "timestamp", "cerrado"]
    list_filter = ["activo"]


@admin.register(LineaTransporte)
class LineaTransporteAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nombre", "tipo", "color", "activa"]
    list_filter = ["tipo"]


@admin.register(Parada)
class ParadaAdmin(admin.ModelAdmin):
    list_display = ["nombre", "linea", "orden"]
    list_filter = ["linea"]
    ordering = ["linea", "orden"]


@admin.register(HorarioTransporte)
class HorarioTransporteAdmin(admin.ModelAdmin):
    list_display = ["linea", "dia_semana", "hora_inicio", "hora_fin", "frecuencia_min"]
    list_filter = ["linea", "dia_semana"]


@admin.register(Alerta)
class AlertaAdmin(admin.ModelAdmin):
    list_display = ["usuario", "nivel", "leida", "creado"]
    list_filter = ["nivel", "leida"]


@admin.register(HistorialViaje)
class HistorialViajeAdmin(admin.ModelAdmin):
    list_display = ["usuario", "origen_nombre", "destino_nombre", "distancia_km", "creado"]
    date_hierarchy = "creado"
