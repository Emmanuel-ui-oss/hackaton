#!/bin/bash
set -e

echo "=== Transporte y Riesgos - EntryPoint ==="

echo "Corriendo migraciones..."
python manage.py migrate --noinput

echo "Cargando seed data..."
python seed.py

echo "Iniciando servidor..."
exec uvicorn api.main:app --host 0.0.0.0 --port "${SERVER_PORT:-8000}" --workers "${WORKERS:-2}"
