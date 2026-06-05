# VisionVial Core

Núcleo de ML y lógica de negocio de VisionVial.

## Arquitectura

Servidor socket JSON-RPC que expone funciones de ML de forma aislada.

### Métodos disponibles

| Método | Parámetros | Descripción |
|--------|-----------|-------------|
| `ping` | — | Health check |
| `predict_congestion` | hora, dia_semana, comuna | Predicción de congestión vehicular |
| `congestion_forecast` | comuna | Pronóstico 24h |
| `zonas_criticas` | eps, min_samples | Clustering DBSCAN de zonas de riesgo |
| `ruta_segura` | origen_lat, origen_lng, dest_lat, dest_lng | Evaluación de ruta segura |

### Uso

```python
import socket, json

s = socket.socket()
s.connect(("127.0.0.1", 9100))
s.sendall(json.dumps({"method": "ping", "id": 1}).encode() + b"\n")
print(s.recv(65535).decode())
```

### Build

```bash
pip install -r requirements.txt
python build.py
```

Genera `dist/visionvial-core.exe` cifrado con AES-256.
