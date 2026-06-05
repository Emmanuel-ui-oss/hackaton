import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("CORE_SECRET_KEY", "core-change-in-production")
DEBUG = os.getenv("CORE_DEBUG", "False").lower() == "true"

# Core solo necesita acceso de lectura a la BD
DATABASES = {
    "default": {
        "ENGINE": os.getenv("CORE_DB_ENGINE", "django.db.backends.sqlite3"),
        "NAME": os.getenv("CORE_DB_NAME", str(BASE_DIR / "db.sqlite3")),
        "USER": os.getenv("CORE_DB_USER", ""),
        "PASSWORD": os.getenv("CORE_DB_PASSWORD", ""),
        "HOST": os.getenv("CORE_DB_HOST", "localhost"),
        "PORT": os.getenv("CORE_DB_PORT", ""),
    }
}

INSTALLED_APPS = [
    "apps.core",
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
TIME_ZONE = "America/Bogota"
LANGUAGE_CODE = "es-co"
