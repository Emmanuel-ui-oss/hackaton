import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ["DJANGO_DEBUG"] = "false"
os.environ["DB_NAME"] = "transporte_riesgos_test"

import django
django.setup()

from django.contrib.auth.models import User
from django.conf import settings
import jwt
import pytest
from datetime import datetime, timedelta, timezone as tz
from httpx import ASGITransport, AsyncClient

from api.main import app


@pytest.fixture(autouse=True)
def _clean_db():
    from django.db import connection
    tables = [t for t in connection.introspection.table_names() if t.startswith("core_")]
    cursor = connection.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS=0")
    for table in tables:
        cursor.execute(f"DELETE FROM {table}")
    cursor.execute("SET FOREIGN_KEY_CHECKS=1")
    User.objects.exclude(is_superuser=True).delete()
    yield


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.fixture
def test_user():
    return User.objects.create_user(
        username="testuser",
        password="testpass123",
        email="test@example.com",
    )


@pytest.fixture
def token(test_user):
    payload = {
        "user_id": test_user.id,
        "username": test_user.username,
        "exp": datetime.now(tz.utc) + timedelta(days=7),
        "iat": datetime.now(tz.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


@pytest.fixture
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def zona_riesgo():
    from apps.core.models import ZonaRiesgo
    return ZonaRiesgo.objects.create(
        nombre="Test Zona",
        comuna="Test Comuna",
        descripcion="Test descripcion",
        tipo_riesgo="VIOLENCIA",
        nivel="ALTO",
        latitud="6.2442",
        longitud="-75.5812",
        radio_metros=500,
    )


@pytest.fixture
def reporte(test_user):
    from apps.core.models import ReporteIncidenteComunitario
    return ReporteIncidenteComunitario.objects.create(
        usuario=test_user,
        tipo="ACCIDENTE",
        descripcion="Test reporte",
        ubicacion_texto="Test ubicacion",
        latitud="6.2442",
        longitud="-75.5812",
    )
