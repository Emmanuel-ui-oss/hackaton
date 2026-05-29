# 🚦 Medellín Movilidata OS

**Plataforma Unificada de Movilidad Inteligente para Medellín**

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

**Medellín Movilidata OS** es una plataforma web progresiva (PWA) que integra analítica predictiva, monitoreo en tiempo real e inteligencia artificial para transformar la movilidad urbana en Medellín.

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

> **Nota:** Las capturas se generan al ejecutar la aplicación. Reemplazar con imágenes reales después del primer despliegue.

---

## ⚙️ Instalación y Ejecución

### Requisitos
- Python 3.12+
- MySQL 8.0+
- Node.js (opcional, solo para desarrollo frontend)

### Paso a paso

```bash
# 1. Clonar el repositorio
git clone https://github.com/Emmanuel-ui-oss/hackaton.git
cd hackaton

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales de base de datos

# 3. Crear base de datos
mysql -u root -p -e "CREATE DATABASE transporte_riesgos CHARACTER SET utf8mb4"

# 4. Instalar dependencias
cd backend
pip install -r requirements.txt

# 5. Ejecutar migraciones
python manage.py migrate

# 6. Poblar base de datos
python seed.py

# 7. Iniciar servidor
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Acceso
- **Frontend:** http://localhost:8000/
- **API Docs:** http://localhost:8000/docs
- **Admin Django:** http://localhost:8000/admin/

### Usuarios por defecto
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | Superusuario |
| `demo` | `demo123` | Usuario demo |

### Con Docker

```bash
docker-compose up --build
```

### En Windows (un clic)
Ejecutar `iniciar.bat` desde el explorador de archivos.

---

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
│   │   ├── schemas/         # Pydantic models
│   │   ├── main.py          # FastAPI entry point
│   │   ├── dependencies.py  # JWT auth
│   │   ├── pagination.py    # Paginación reutilizable
│   │   └── exception_handlers.py
│   ├── apps/core/
│   │   ├── models.py        # 22 modelos Django
│   │   └── admin.py         # Django admin config
│   ├── config/              # Django settings
│   ├── static/
│   │   ├── css/base.css     # Estilos
│   │   ├── js/              # app.js, api.js, mapa.js
│   │   ├── lib/leaflet/     # Leaflet offline
│   │   ├── img/             # Iconos PWA
│   │   ├── manifest.json    # PWA manifest
│   │   └── service-worker.js
│   ├── tests/               # 67 pruebas
│   ├── seed.py              # Datos semilla
│   └── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🧠 Funcionalidades

### ✅ Dashboard
- Estadísticas generales (zonas, reportes, líneas, alertas)
- Gráfico de zonas por nivel de riesgo
- Búsqueda global en toda la plataforma
- Indicador de conectividad (online/offline)

### ✅ Mapa Interactivo
- Zonas de riesgo coloreadas por nivel (CRÍTICO, ALTO, MEDIO, BAJO)
- Reportes comunitarios con íconos por tipo (accidente, robo, bloqueo...)
- Líneas de transporte con polyíneas de colores y paradas
- Alertas activas con marcadores pulsantes
- Favoritos del usuario
- Leyenda interactiva
- Geolocalización del usuario
- Checkboxes para ocultar/mostrar capas

### ✅ Zonas de Riesgo
- Lista con filtros por comuna y nivel
- Mini-mapa con círculos de riesgo

### ✅ Reportes Comunitarios
- Crear reportes con ubicación
- Votación positiva/negativa
- Ocultamiento automático por votos negativos
- Sistema de tabs (listar/crear)

### ✅ Transporte Público
- 8 líneas (Metro, Metroplús, Tranvía, Cable, Buses)
- Paradas ordenadas por recorrido
- Mini-mapa con polyíneas

### ✅ Alertas de Riesgo
- Filtro de no leídas
- Marcación individual como leída
- Asociadas a zonas de riesgo

### ✅ Favoritos y Contactos
- CRUD completo
- Botón SOS con notificación a contactos

### ✅ Historial de Viajes
- Registro de origen, destino, distancia, tiempo, costo

### ✅ Autenticación
- JWT con 7 días de expiración
- Registro e inicio de sesión
- Protección por bearer token

### ✅ PWA
- Instalable en dispositivos móviles
- Service Worker con estrategia Cache First para estáticos
- Network First para API con fallback a caché
- Iconos y manifest

---

## 👥 Integrantes y Roles

| Rol | Integrante |
|-----|-----------|
| 🧑‍💻 Backend Developer | — |
| 💻 Frontend Developer | — |
| 🎨 UX/UI Designer | — |
| 🎬 Diseñador Audiovisual & Branding | — |

> *Completar con los nombres del equipo.*

---

## 📜 Licencia

Proyecto académico desarrollado para **HackData CTGI SENA 2026**.
