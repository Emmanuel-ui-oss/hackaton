import json
import logging

from asgiref.sync import sync_to_async

logger = logging.getLogger("auditoria")


def log_audit(usuario, accion, modelo, id_objeto=None, detalles=None):
    from apps.core.models import LogAuditoria
    try:
        LogAuditoria.objects.create(
            usuario=usuario if usuario.is_authenticated else None,
            accion=accion,
            modelo=modelo,
            id_objeto=id_objeto,
            detalles=detalles or {},
        )
    except Exception as e:
        logger.warning("Audit log failed: %s", e)


async def log_audit_async(usuario, accion, modelo, id_objeto=None, detalles=None):
    from apps.core.models import LogAuditoria
    try:
        await sync_to_async(LogAuditoria.objects.create)(
            usuario=usuario if usuario.is_authenticated else None,
            accion=accion,
            modelo=modelo,
            id_objeto=id_objeto,
            detalles=detalles or {},
        )
    except Exception as e:
        logger.warning("Audit log failed: %s", e)
