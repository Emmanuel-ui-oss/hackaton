# Fuentes de Datos - VisionVial

## Datos Abiertos Integrados

### 1. Observatorio de Movilidad de Medellín
- **URL**: https://www.medellin.gov.co/es/secretaria-de-movilidad/observatorio-de-movilidad/
- **Datos**: Incidentes viales, víctimas de tránsito, fotomultas
- **Uso**: Alimenta `EventoRiesgo` (tipo: accidente_vial) y `ZonaRiesgo`
- **Frecuencia**: Diaria

### 2. SIM - Sistema Inteligente de Movilidad
- **URL**: https://www.medellin.gov.co/es/secretaria-de-movilidad/sistema-inteligente-de-movilidad-de-medellin/
- **Datos**: Flujo vehicular, congestión en tiempo real
- **Uso**: Base para modelos de predicción de congestión
- **Frecuencia**: Tiempo real (cada 5 min)

### 3. MedData - Datos Abiertos Medellín
- **URL**: https://medata.gov.co/search/
- **Datos**: Datos georreferenciados, indicadores municipales
- **Uso**: Datos complementarios para análisis estadístico

### 4. SIATA - Sistema de Alerta Temprana
- **URL**: https://siata.gov.co/siata_nuevo/
- **Datos**: Datos climáticos, lluvias, alertas meteorológicas
- **Uso**: Correlación clima ↔ accidentalidad para rutas seguras
- **Frecuencia**: Tiempo real

### 5. Datos Abiertos Colombia
- **URL**: https://www.datos.gov.co/
- **Datos**: Datos nacionales complementarios

### 6. Google Maps Platform
- **URL**: https://cloud.google.com/maps-platform
- **Datos**: Georreferenciación, rutas, direcciones
- **Uso**: Coordenadas y cálculo de distancias

## Datos Semilla (Seed)

El archivo `backend/seed.py` genera datos de prueba representativos:

| Tabla | Registros | Descripción |
|-------|-----------|-------------|
| ZonaRiesgo | 16 | Las 16 comunas de Medellín con niveles de riesgo |
| EventoRiesgo | 25 | Eventos simulados de SIMUR/DAGRD (accidentes, inundaciones, deslizamientos) |
| LineaTransporte | 8 | Metro A/B, Metroplús 1/2, Tranvía, Metrocable H/J/K |
| Parada | 25 | Paradas distribuidas por línea |
| ReporteIncidente | 8 | Reportes comunitarios de prueba |
| Alerta | 5 | Alertas de riesgo |

## APIs Externas (Placeholder)

El script `backend/scripts/ingest_external.py` contiene la estructura para conectar con:
- **SIMUR API**: `https://simur.medellin.gov.co/api/eventos`
- **DAGRD API**: API del Departamento Administrativo de Gestión del Riesgo

Actualmente usa URLs placeholder. Para producción, reemplazar con las URLs reales de las APIs.
