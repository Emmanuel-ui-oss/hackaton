# Arquitectura del Sistema - Medellín Movilidata OS

## Diagrama de Arquitectura

```
                    ┌─────────────┐
                    │   Cliente   │
                    │  (PWA SPA)  │
                    └──────┬──────┘
                           │ HTTP/JSON
                    ┌──────▼──────┐
                    │   FastAPI   │
                    │  (ASGI)     │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌────▼─────┐
       │ Django ORM │ │   ML   │ │  Static  │
       │ (Modelos)  │ │ Módulos│ │  Frontend│
       └──────┬─────┘ └────────┘ └──────────┘
              │
       ┌──────▼─────┐
       │   SQLite   │
       │  (o MySQL) │
       └────────────┘
```

## Tecnologías

### Backend
- **Python 3.12+**: Lenguaje principal
- **FastAPI**: Framework REST API (ASGI)
- **Django ORM**: Modelado de datos y migraciones
- **SQLite/MySQL**: Base de datos relacional
- **PyJWT**: Autenticación por tokens JWT
- **Uvicorn**: Servidor ASGI

### Machine Learning
- **scikit-learn**: DBSCAN clustering para detección de zonas críticas
- **NumPy**: Operaciones numéricas y estadísticas
- **StatsModels**: Modelos de series temporales para predicción de congestión

### Frontend
- **HTML5 + CSS3**: Estructura y estilo
- **JavaScript Vanilla**: Lógica de la SPA (sin frameworks)
- **Leaflet.js**: Mapas interactivos
- **Chart.js**: Visualización de datos (donut, bar)
- **PWA**: Service Worker + Manifest para funcionamiento offline

### DevOps
- **Docker + docker-compose**: Contenedores
- **Git**: Control de versiones

## Estructura del Proyecto

```
hackaton/
├── backend/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.py           # Autenticación JWT
│   │   │   └── v1/
│   │   │       ├── items.py      # CRUD reportes
│   │   │       ├── extras.py     # Eventos, stats, upload
│   │   │       └── predict.py    # Endpoints ML
│   │   ├── ml/
│   │   │   ├── congestion.py     # Modelo predicción congestión
│   │   │   ├── clustering.py     # DBSCAN zonas críticas
│   │   │   └── routes.py         # Evaluación rutas seguras
│   │   ├── main.py               # FastAPI entry point
│   │   └── dependencies.py       # JWT auth middleware
│   ├── apps/core/
│   │   ├── models.py             # 13 modelos Django
│   │   ├── admin.py              # Config Django admin
│   │   └── management/commands/
│   │       └── ingest_external.py # Comando de ingesta
│   ├── scripts/
│   │   ├── ingest_external.py    # Script ingesta APIs
│   │   └── seed.py               # Datos semilla
│   └── config/
│       ├── settings.py           # Config Django
│       └── urls.py               # URLs Django
├── frontend/
│   ├── index.html                # SPA principal
│   └── static/
│       ├── css/app.css           # Estilos
│       ├── js/                   # Módulos JS
│       │   ├── api.js            # Cliente HTTP
│       │   ├── auth.js           # Login/register
│       │   ├── router.js         # Navegación SPA
│       │   ├── map.js            # Mapa Leaflet
│       │   ├── report.js         # Formulario reportes
│       │   ├── stats.js          # Dashboard Chart.js
│       │   └── app.js            # Entry point
│       ├── manifest.json         # PWA manifest
│       └── service-worker.js     # Service Worker
├── docs/
│   ├── api.md                    # Documentación API
│   ├── architecture.md           # Esta guía
│   └── data-sources.md           # Fuentes de datos
├── docker-compose.yml
├── Dockerfile
└── README.md
```

## Modelos de Datos (Django ORM)

### Core Models
- **CategoriaRiesgo**: Categorización de niveles de riesgo
- **ZonaRiesgo**: 16 comunas de Medellín con nivel de riesgo
- **EventoRiesgo**: Eventos de riesgo (SIMUR, DAGRD, usuario)
- **ReporteIncidente**: Reportes comunitarios
- **LineaTransporte**: Líneas de Metro, Metroplús, Tranvía, Cable
- **Parada**: Paradas de cada línea
- **Alerta**: Alertas de riesgo por usuario
- **Favorito**: Ubicaciones favoritas del usuario
- **ContactoEmergencia**: Contactos de emergencia
- **HistorialViaje**: Historial de viajes realizados
- **EventoSOS**: Eventos de emergencia SOS
- **VotoReporte**: Votación de reportes comunitarios
- **LogAuditoria**: Auditoría de acciones

## Flujo de Datos

1. **Ingesta Externa**: Scripts conectan con APIs de SIMUR/DAGRD/SIATA → `EventoRiesgo`
2. **Reportes Usuario**: Frontend → API → `ReporteIncidente`
3. **Predicción ML**: Endpoints ML consultan datos históricos → modelo estadístico → predicción
4. **Visualización**: Frontend Leaflet muestra `EventoRiesgo` + `ZonaRiesgo` en mapa interactivo
