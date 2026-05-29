# Transporte y Riesgos - Medellín

App de transporte y gestión de riesgos urbanos para Medellín y zonas urbanas.

## Stack

- **Backend API**: FastAPI + Django ORM
- **Admin**: Django Admin
- **Frontend**: Leaflet.js + OpenStreetMap + CSS nativo
- **BD**: MySQL/MariaDB
- **Deploy**: GitHub → Render.com

## Setup local

```bash
# 1. Entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 2. Instalar dependencias
pip install -r backend/requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de BD

# 4. Crear BD
mysql -u root -e "CREATE DATABASE hackathon_db"

# 5. Migrar
python backend/manage.py migrate

# 6. Crear superuser
python backend/manage.py createsuperuser

# 7. Cargar eventos de ejemplo
python backend/manage.py ingest_external --seed

# 8. Arrancar
uvicorn backend.api.main:app --reload
```

Abrir:
- Mapa: http://localhost:8000/
- Swagger: http://localhost:8000/docs
- Admin: http://localhost:8000/admin/

## Docker

```bash
docker-compose up --build
```

## Despliegue en Render

1. Crear repo en GitHub y subir el código
2. En Render: New Web Service → conectar repo
3. Configurar:
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT`
   - **Variables de entorno**: cargar desde `.env.example`
4. Render deployea automáticamente cada push a `main`

## Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login (devuelve JWT) |
| GET | `/api/auth/me` | Perfil del usuario actual |
| GET | `/api/v1/categorias` | Listar categorías de riesgo |
| GET | `/api/v1/zonas-riesgo` | Listar zonas de riesgo |
| GET | `/api/v1/zonas-riesgo/{id}` | Detalle de zona |
| POST | `/api/v1/zonas-riesgo` | Crear zona (admin) |
| PUT | `/api/v1/zonas-riesgo/{id}` | Actualizar zona (admin) |
| DELETE | `/api/v1/zonas-riesgo/{id}` | Eliminar zona (admin) |
| GET | `/api/v1/items/stats` | Estadísticas |
| GET | `/api/v1/items/export/csv` | Exportar reportes a CSV |
| POST | `/api/v1/items/import` | Importar reportes desde JSON |
| POST | `/api/v1/upload` | Subir archivo |
| GET | `/api/v1/search?q=` | Búsqueda global |
| POST | `/api/v1/reportes` | Crear reporte de incidente (auth) |
| GET | `/api/v1/eventos/near?lat=&lng=&radio_km=` | Eventos de riesgo cercanos (público) |
| GET | `/` | SPA: mapa Leaflet.js con eventos en tiempo real |
| GET | `/mapa` | Mapa Leaflet.js (alternativo) |

## Frontend (SPA)

- `/` — Mapa interactivo con eventos de riesgo geolocalizados, polling cada 60s
- `/mapa` — Misma vista del mapa
- **Mapa**: Navegación por clic, sidebar con detalle de eventos, capas de colores por nivel
- **Login/Register**: Autenticación JWT con persistencia en localStorage
- **Reportar**: Formulario de reporte de incidentes (requiere auth)
- **Estadísticas**: Dashboard con métricas, gráficos por tipo/estado, últimos reportes

## Datos de ejemplo

```bash
# Cargar eventos de prueba en Medellín
python backend/manage.py ingest_external --seed

# Limpiar eventos expirados
python backend/manage.py ingest_external --clean
```

## Script de ingesta automática

El script `backend/scripts/ingest_external.py` consulta fuentes externas (SIMUR, DAGRD) y normaliza los datos. Para ejecutarlo como cron:

```cron
*/5 * * * * cd /app && python backend/scripts/ingest_external.py
```
