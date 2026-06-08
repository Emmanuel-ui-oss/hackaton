# 🚦 VisionVial

**Plataforma de Movilidad Inteligente**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Django](https://img.shields.io/badge/Django-4.2-092E20?style=flat&logo=django&logoColor=white)](https://djangoproject.com)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql&logoColor=white)](https://mysql.com)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=flat&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![PWA](https://img.shields.io/badge/PWA-✓-5A0FC8?style=flat)](https://web.dev/progressive-web-apps/)
[![JavaScript](https://img.shields.io/badge/JS-Vanilla-F7DF1E?style=flat&logo=javascript&logoColor=black)](https://developer.mozilla.org/JavaScript)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat&logo=docker&logoColor=white)](https://docker.com)

---

## 📋 Descripción

**VisionVial** es una plataforma web progresiva (PWA) que integra analítica predictiva, monitoreo en tiempo real e inteligencia artificial para transformar la movilidad urbana en Medellín.

Desarrollada para **HackData CTGI SENA 2026**, la plataforma aborda cuatro desafíos interconectados:
- 🚨 **Zonas críticas de accidentalidad** — detección y predicción por sector geográfico
- 🚗 **Congestión vehicular** — monitoreo en tiempo real y predicción 2-4 horas antes
- 🌧️ **Rutas seguras en temporada de lluvias** — correlación lluvia ↔ accidentalidad
- 🗺️ **Visualización geoespacial** — mapa interactivo con todas las capas de datos

---

## 🎯 Objetivo

Proporcionar a ciudadanos, conductores y autoridades una herramienta integral para:
1. **Prevenir** accidentes identificando zonas de alto riesgo
2. **Optimizar** rutas evitando congestión y vías peligrosas
3. **Alertar** sobre condiciones adversas en tiempo real
4. **Reportar** incidentes comunitarios para mejorar la movilidad colectiva

---

## 🛠️ Tecnologías

### Backend
| Tecnología | Uso |
|-----------|-----|
| **Python 3.12+** | Lenguaje principal |
| **FastAPI** | Framework REST API |
| **Django ORM** | Modelado de datos y migraciones |
| **MySQL 8** | Base de datos relacional |
| **PyJWT** | Autenticación por tokens |
| **Uvicorn** | Servidor ASGI |

### Frontend
| Tecnología | Uso |
|-----------|-----|
| **HTML5 + CSS3** | Estructura y estilo |
| **JavaScript Vanilla** | Lógica de la SPA |
| **Leaflet.js** | Mapas interactivos offline |
| **PWA** | Service Worker + Manifest |
| **Chart.js** | Visualización analítica (próximamente) |

### DevOps
| Tecnología | Uso |
|-----------|-----|
| **Docker** + **docker-compose** | Contenedores |
| **GitHub** | Control de versiones |
| **Pytest** + **httpx** | Pruebas automatizadas |

---

## 📊 Fuentes de Datos

| Fuente | Tipo | Uso |
|--------|------|-----|
| [Observatorio de Movilidad de Medellín](https://www.medellin.gov.co/es/secretaria-de-movilidad/observatorio-de-movilidad/) | Datos abiertos | Incidentes viales, víctimas |
| [SIM - Sistema Inteligente de Movilidad](https://www.medellin.gov.co/es/secretaria-de-movilidad/sistema-inteligente-de-movilidad-de-medellin/) | API | Flujo vehicular, congestión |
| [MedData - Datos Abiertos Medellín](https://medata.gov.co/search/) | Portal Open Data | Datos georreferenciados |
| [SIATA](https://siata.gov.co/siata_nuevo/) | API climática | Lluvias, alertas meteorológicas |
| [Google Maps Platform](https://cloud.google.com/maps-platform) | API | Georreferenciación, rutas |
| [Datos.gov.co](https://www.datos.gov.co/) | Portal nacional | Datos complementarios |

---

## 🖥️ Capturas

| Dashboard | Mapa Interactivo |
|-----------|-----------------|
| ![Dashboard](backend/static/img/screenshot-dashboard.png) | ![Mapa](backend/static/img/screenshot-mapa.png) |

| Zonas de Riesgo | Transporte |
|----------------|-----------|
| ![Zonas](backend/static/img/screenshot-zonas.png) | ![Transporte](backend/static/img/screenshot-lineas.png) |

> **Nota:** Agregar capturas reales de la aplicación después del despliegue.

---

## ⚙️ Instalación y Ejecución

### Requisitos
- Python 3.12+
- Node.js 18+
- SQLite (por defecto) o MySQL 8.0+

### Método recomendado (npm)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Emmanuel-ui-oss/hackaton.git
cd hackaton

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Instalar todo (backend + frontend) y migrar la base de datos
npm install        # instala concurrently
npm run setup      # instala dependencias, migra y puebla la BD

# 4. Levantar backend y frontend simultáneamente
npm run dev
```

# Tunel
```bash
npm run online
```

### Acceso
- **Frontend:** http://localhost:5173/
- **Backend API:** http://localhost:8001/
- **API Docs (Swagger):** http://localhost:8001/docs
- **Admin Django:** http://localhost:8001/admin/

### Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run i` | Instala dependencias de backend y frontend |
| `npm run migrate` | Ejecuta migraciones de Django |
| `npm run seed` | Puebla la BD con datos de Medellín |
| `npm run setup` | Todo lo anterior en un solo paso |
| `npm run dev` | Levanta backend y frontend simultáneamente |
| `npm run build` | Compila el frontend para producción |

### Método manual (sin npm)

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
uvicorn api.main:app --reload --port 8001

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev
```

### Con Docker

```bash
docker-compose up --build
```

### Usuarios por defecto
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Superusuario |
| `demo` | `demo123` | Usuario demo |

## 🧪 Pruebas

```bash
cd backend
pytest tests/ -v
```

**67 pruebas** que cubren:
- Autenticación (registro, login, JWT, 401/403)
- CRUD de items
- Zonas de riesgo, reportes, favoritos, contactos
- Búsqueda, estadísticas, export CSV
- Validación de esquemas
- Paginación

---

## 📁 Estructura del Proyecto

```
hackaton/
├── backend/
│   ├── api/
│   │   ├── routes/          # Endpoints REST
│   │   │   ├── auth.py      # Autenticación JWT
│   │   │   └── v1/
│   │   │       ├── items.py  # CRUD reportes
│   │   │       ├── extras.py # Eventos, stats
│   │   │       └── predict.py # ML endpoints
│   │   ├── ml/              # Módulos ML
│   │   │   ├── congestion.py # Predicción congestión
│   │   │   ├── clustering.py # DBSCAN zonas críticas
│   │   │   └── routes.py    # Rutas seguras
│   │   ├── main.py          # FastAPI entry point
│   │   └── dependencies.py  # JWT auth middleware
│   ├── apps/core/
│   │   ├── models.py        # 13 modelos Django
│   │   ├── admin.py         # Django admin
│   │   └── management/commands/
│   │       └── ingest_external.py
│   ├── scripts/
│   │   ├── seed.py          # Datos semilla
│   │   └── ingest_external.py # Ingesta APIs
│   └── config/              # Django settings
├── frontend/
│   ├── index.html           # SPA principal
│   └── static/
│       ├── css/app.css      # Estilos
│       ├── js/              # Módulos JS (SPA)
│       ├── manifest.json    # PWA manifest
│       └── service-worker.js
├── docs/                    # Documentación
│   ├── api.md               # API reference
│   ├── architecture.md      # Arquitectura
│   └── data-sources.md      # Fuentes de datos
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🧠 Funcionalidades

### 🗺️ Mapa Interactivo
- Eventos de riesgo geolocalizados (SIMUR, DAGRD, usuario)
- Zonas de riesgo coloreadas por nivel (CRÍTICO, ALTO, MEDIO, BAJO)
- Cálculo de distancia desde la ubicación del usuario
- Sidebar con detalle de eventos
- Leyenda interactiva
- Geolocalización del usuario
- Actualización automática cada 60s

### 📊 Dashboard con Analytics
- Estadísticas generales (reportes, zonas, eventos)
- Gráfico donut de tipos de incidente
- Gráfico de barras por estado
- Últimos reportes en tiempo real
- Resumen de infraestructura y alertas

### 🤖 Predicción ML (Nuevo)
- **Predicción de congestión vehicular** por hora y comuna
- **Pronóstico de 24 horas** con niveles de congestión
- **Detección de zonas críticas** con DBSCAN clustering
- **Evaluación de rutas seguras** con peligros cercanos

### 🚨 Gestión de Riesgos
- Eventos de riesgo con niveles (bajo, medio, alto, crítico)
- Alertas personalizadas por usuario
- Reportes comunitarios con votación
- Categorías de riesgo configurables

### 🚇 Transporte Público
- 8 líneas (Metro, Metroplús, Tranvía, Cable)
- Paradas ordenadas por recorrido
- Rutas y tiempos estimados

### 🔐 Autenticación
- JWT con 7 días de expiración
- Registro e inicio de sesión
- Protección por bearer token

### 📱 PWA
- Instalable en dispositivos móviles
- Service Worker con estrategia Cache First
- Network First para API con fallback a caché
- Iconos y manifest

---

## 👥 Integrantes y Roles

| Rol | Integrante |
|-----|-----------|
| 🧑‍💻 Backend Developer | Emmanuel Restrepo |
| 💻 Frontend Developer | — |
| 🎨 UX/UI Designer | — |
| 🎬 Diseñador Audiovisual & Branding | — |

> *Completar con los nombres del equipo.*

---

## 📚 Documentación Técnica

- [API Reference](docs/api.md) — Documentación completa de endpoints
- [Arquitectura](docs/architecture.md) — Diagrama, tecnologías y flujo de datos
- [Fuentes de Datos](docs/data-sources.md) — APIs externas y datasets utilizados

---

## 🧠 Endpoints ML Disponibles

| Endpoint | Descripción | Ejemplo |
|----------|-------------|---------|
| `GET /api/v1/predict/congestion` | Predicción por hora y comuna | `/predict/congestion?hora=8&comuna=Comuna%2010%20-%20La%20Candelaria` |
| `GET /api/v1/predict/congestion/forecast` | Pronóstico 24h | `/predict/congestion/forecast?comuna=El%20Poblado` |
| `GET /api/v1/predict/zonas-criticas` | Clustering DBSCAN | `/predict/zonas-criticas?eps=0.008&min_samples=3` |
| `GET /api/v1/predict/ruta-segura` | Evaluación de ruta | `/predict/ruta-segura?origen_lat=6.2476&origen_lng=-75.5658&dest_lat=6.2150&dest_lng=-75.5600` |

---

## 📜 Licencia

Proyecto académico desarrollado para **HackData CTGI SENA 2026**.
