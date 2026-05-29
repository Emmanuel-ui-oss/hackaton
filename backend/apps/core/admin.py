from django.contrib import admin

from apps.core.models import (
    CategoriaRiesgo,
    ZonaRiesgo,
    ReporteIncidente,
    VotoReporte,
    ContactoEmergencia,
    EventoRiesgo,
    LogAuditoria,
)


@admin.register(CategoriaRiesgo)
class CategoriaRiesgoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "nivel", "color")
    list_filter = ("nivel",)
    search_fields = ("nombre",)


@admin.register(ZonaRiesgo)
class ZonaRiesgoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "comuna", "categoria", "activo")
    list_filter = ("categoria", "comuna", "activo")
    search_fields = ("nombre", "comuna")
    actions = ["activar_zonas", "desactivar_zonas"]

    @admin.action(description="Activar zonas seleccionadas")
    def activar_zonas(self, request, queryset):
        queryset.update(activo=True)

    @admin.action(description="Desactivar zonas seleccionadas")
    def desactivar_zonas(self, request, queryset):
        queryset.update(activo=False)


@admin.register(ReporteIncidente)
class ReporteIncidenteAdmin(admin.ModelAdmin):
    list_display = ("tipo", "usuario", "ubicacion", "estado", "creado")
    list_filter = ("tipo", "estado", "creado")
    search_fields = ("descripcion", "ubicacion")
    actions = ["aprobar_reportes", "ocultar_reportes"]

    @admin.action(description="Aprobar reportes seleccionados")
    def aprobar_reportes(self, request, queryset):
        queryset.update(estado="aprobado")

    @admin.action(description="Ocultar reportes seleccionados")
    def ocultar_reportes(self, request, queryset):
        queryset.update(estado="oculto")


@admin.register(VotoReporte)
class VotoReporteAdmin(admin.ModelAdmin):
    list_display = ("usuario", "reporte", "voto", "creado")
    list_filter = ("voto",)


@admin.register(ContactoEmergencia)
class ContactoEmergenciaAdmin(admin.ModelAdmin):
    list_display = ("usuario", "nombre", "telefono")
    search_fields = ("nombre", "telefono")


@admin.register(EventoRiesgo)
class EventoRiesgoAdmin(admin.ModelAdmin):
    list_display = ("titulo", "tipo", "nivel", "fuente", "activo", "expira_en", "creado")
    list_filter = ("tipo", "nivel", "fuente", "activo")
    search_fields = ("titulo", "descripcion")
    actions = ["marcar_activo", "marcar_inactivo"]

    @admin.action(description="Marcar eventos como activos")
    def marcar_activo(self, request, queryset):
        queryset.update(activo=True)

    @admin.action(description="Marcar eventos como inactivos")
    def marcar_inactivo(self, request, queryset):
        queryset.update(activo=False)


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("usuario", "accion", "modelo", "timestamp")
    list_filter = ("accion", "timestamp")
    search_fields = ("usuario__username", "accion")
    readonly_fields = ("usuario", "accion", "modelo", "id_objeto", "detalles", "timestamp")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
