# Documentación de API - Medellín Movilidata OS

## Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar nuevo usuario |
| POST | `/api/auth/login` | Iniciar sesión (devuelve JWT) |
| GET | `/api/auth/me` | Obtener perfil del usuario autenticado |

## Items (Reportes de Incidentes)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| CRUD | `/api/v1/items/*` | CRUD completo de reportes de incidentes | Requiere JWT |

## Extras

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/items/stats` | Estadísticas generales del sistema | Requiere JWT |
| GET | `/api/v1/items/export/csv` | Exportar reportes a CSV | Admin |
| POST | `/api/v1/items/import` | Importar reportes desde JSON | Admin |
| POST | `/api/v1/reportes` | Crear reporte comunitario | Requiere JWT |
| GET | `/api/v1/eventos/near` | Eventos de riesgo cerca de una ubicación | Público |
| GET | `/api/v1/search` | Búsqueda global de reportes | Requiere JWT |
| POST | `/api/v1/upload` | Subir archivo multimedia | Requiere JWT |

## Predicción ML (Nuevo)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/predict/congestion` | Predicción de congestión por hora y comuna |
| GET | `/api/v1/predict/congestion/forecast` | Pronóstico de 24 horas de congestión |
| GET | `/api/v1/predict/zonas-criticas` | Detección de zonas críticas (DBSCAN clustering) |
| GET | `/api/v1/predict/ruta-segura` | Evaluación de ruta con peligros cercanos |

### Parámetros de ejemplo

**GET /api/v1/predict/congestion?hora=8&comuna=Comuna%2010%20-%20La%20Candelaria**

```json
{
  "probabilidad": 100.0,
  "nivel": "critico",
  "hora": 8,
  "dia": "viernes",
  "comuna": "Comuna 10 - La Candelaria"
}
```

**GET /api/v1/predict/zonas-criticas?eps=0.008&min_samples=3**

```json
{
  "clusters": [
    {
      "id": 0,
      "centro": {"lat": 6.198, "lng": -75.563},
      "radio_metros": 970,
      "total_incidentes": 7,
      "nivel": "alto",
      "tipos": ["ACCIDENTE", "accidente_vial", "inundacion"]
    }
  ],
  "total_puntos": 33,
  "total_clusters": 3
}
```

**GET /api/v1/predict/ruta-segura?origen_lat=6.2476&origen_lng=-75.5658&dest_lat=6.2150&dest_lng=-75.5600**

```json
{
  "origen": {"lat": 6.2476, "lng": -75.5658},
  "destino": {"lat": 6.215, "lng": -75.56},
  "distancia_km": 3.68,
  "tiempo_estimado_min": 5,
  "riesgo_general": "bajo",
  "peligros_en_ruta": []
}
```
