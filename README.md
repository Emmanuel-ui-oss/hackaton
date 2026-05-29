# Hackaton - API de Accidentes de Medellín 🚗

API construida con **FastAPI** que expone datos de accidentes de tránsito en Medellín a partir del dataset `MUERTOS_2021.xlsx`.

## 📁 Archivos

- `conversion.py` — Convierte el Excel a JSON estructurado y limpio.
- `accidentes.json` — Dataset en JSON listo para consumir.
- `main.py` — API REST con endpoints para consultar accidentes, filtros por barrio/gravedad, búsqueda geográfica, heatmap, insights y simulación de datos en tiempo real.
- `MUERTOS_2021.xlsx` — Fuente de datos original.

## 🚀 Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Mensaje de bienvenida |
| GET | `/accidentes?limit=&gravedad=` | Lista de accidentes con filtros |
| GET | `/accidentes/zona/{barrio}` | Accidentes por barrio |
| GET | `/accidentes/cercanos?lat=&lon=&radio=` | Accidentes cercanos a una ubicación |
| GET | `/heatmap` | Puntos para mapa de calor |
| GET | `/insights/por-barrio` | Ranking de barrios por siniestros |
| GET | `/insights/gravedad` | Distribución por gravedad |
| GET | `/insights/zonas-criticas` | Top zonas críticas |
| GET | `/insights/resumen` | Resumen general |
| GET | `/insights/tendencia-fecha` | Accidentes por fecha |
| GET | `/realtime/accidentes` | Muestra aleatoria simulada |
| GET | `/realtime/estado` | Estado del sistema en vivo |
| GET | `/realtime/flujo` | Flujo simulado de eventos |
| GET | `/realtime/alerta` | Alerta automática simulada |

## ▶️ Cómo ejecutar

```bash
pip install fastapi uvicorn pandas
uvicorn main:app --reload
```
