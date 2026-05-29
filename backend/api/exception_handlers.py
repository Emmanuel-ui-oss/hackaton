import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import http_exception_handler as _http_handler
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("transporte_riesgos")


async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s\n%s", exc, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servidor", "type": "internal_error"},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning("HTTP %s: %s | %s %s", exc.status_code, exc.detail, request.method, request.url.path)
    return await _http_handler(request, exc)


async def validation_exception_handler(request: Request, exc):
    logger.warning("Validation error: %s | %s %s", exc.errors(), request.method, request.url.path)
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "type": "validation_error"},
    )
