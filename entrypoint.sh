#!/bin/bash
set -e

python backend/manage.py migrate --noinput

python backend/manage.py collectstatic --noinput --clear 2>/dev/null || true

echo "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'admin123')" | python backend/manage.py shell

exec uvicorn backend.api.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers 2
