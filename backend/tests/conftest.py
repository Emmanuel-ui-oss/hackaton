import os, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

from pathlib import Path
TEST_DB = str(Path(__file__).resolve().parent / "test_db.sqlite3")
if os.path.exists(TEST_DB):
    os.remove(TEST_DB)
os.environ["DB_NAME"] = TEST_DB

import django
from django.core.management import call_command
django.setup()
call_command("migrate", "--run-syncdb", verbosity=0)

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
    tables = [t for t in connection.introspection.table_names()
              if not t.startswith("sqlite_")]
    cursor = connection.cursor()
    cursor.execute("PRAGMA foreign_keys = OFF")
    for table in tables:
        cursor.execute(f"DELETE FROM {table}")
    cursor.execute("PRAGMA foreign_keys = ON")
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
        is_staff=True,
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
        tipo_riesgo="ACCIDENTE",
        nivel="ALTO",
        latitud=6.2442,
        longitud=-75.5812,
        radio_metros=500,
    )


@pytest.fixture
def reporte(test_user):
    from apps.core.models import ReporteIncidente
    return ReporteIncidente.objects.create(
        usuario=test_user,
        tipo="accidente",
        descripcion="Test reporte",
        ubicacion="6.2442,-75.5812",
        ubicacion_texto="Test ubicacion",
        latitud=6.2442,
        longitud=-75.5812,
        estado="pendiente",
    )


@pytest.fixture
def categoria_riesgo():
    from apps.core.models import CategoriaRiesgo
    return CategoriaRiesgo.objects.create(
        nombre="Test Categoria",
        nivel="alto",
        color="#FF0000",
    )


@pytest.fixture
def zona_riesgo_data(categoria_riesgo):
    return {
        "nombre": "Zona Test",
        "comuna": "Comuna 14 - El Poblado",
        "descripcion": "Zona de prueba",
        "tipo_riesgo": "ACCIDENTE",
        "nivel": "ALTO",
        "categoria_id": categoria_riesgo.id,
        "latitud": 6.2100,
        "longitud": -75.5650,
        "radio_metros": 500,
    }
