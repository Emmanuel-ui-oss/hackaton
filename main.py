from fastapi import FastAPI, Query
from typing import Optional
import json
import time
import random
from collections import defaultdict

app = FastAPI()

# =========================
# CARGA DE DATOS
# =========================
with open("accidentes.json", "r", encoding="utf-8") as archivo:
    accidentes = json.load(archivo)

# =========================
# ÍNDICES (OPTIMIZACIÓN)
# =========================
por_barrio = defaultdict(list)

for a in accidentes:
    barrio = str(a.get("barrio") or "").strip().lower()
    por_barrio[barrio].append(a)


# =========================
# RUTA PRINCIPAL
# =========================
@app.get("/")
def inicio():
    return {"mensaje": "API de accidentes Medellín"}


# =========================
# TODOS LOS ACCIDENTES (con filtros)
# =========================
@app.get("/accidentes")
def obtener_accidentes(
    limit: int = 50,
    gravedad: Optional[str] = None
):
    resultado = accidentes

    if gravedad:
        resultado = [
            a for a in resultado
            if a.get("gravedad", "").lower() == gravedad.lower()
        ]

    return resultado[:limit]


# =========================
# ACCIDENTES POR BARRIO (OPTIMIZADO)
# =========================
@app.get("/accidentes/zona/{barrio}")
def accidentes_por_barrio(barrio: str):
    return por_barrio[barrio.lower()]


# =========================
# ACCIDENTES CERCANOS
# =========================
@app.get("/accidentes/cercanos")
def accidentes_cercanos(lat: float, lon: float, radio: float = 0.01):
    return [
        a for a in accidentes
        if abs(float(a.get("latitud", 0)) - lat) < radio and
           abs(float(a.get("longitud", 0)) - lon) < radio
    ]


# =========================
# HEATMAP BASE (para mapa)
# =========================
@app.get("/heatmap")
def heatmap():
    return [
        {
            "lat": float(a.get("latitud", 0)),
            "lon": float(a.get("longitud", 0)),
            "peso": 1
        }
        for a in accidentes
        if a.get("latitud") and a.get("longitud")
    ]


# =========================
# INSIGHTS
# =========================

@app.get("/insights/por-barrio")
def insights_por_barrio():
    return sorted(
        [
            {"barrio": barrio, "total": len(lista)}
            for barrio, lista in por_barrio.items()
        ],
        key=lambda x: x["total"],
        reverse=True
    )

@app.get("/insights/gravedad")
def insights_gravedad():
    conteo = {}

    for a in accidentes:
        gravedad = str(a.get("gravedad") or "").lower()

        if gravedad:
            conteo[gravedad] = conteo.get(gravedad, 0) + 1

    return conteo


@app.get("/insights/zonas-criticas")
def zonas_criticas(limit: int = 5):
    data = sorted(
        [
            {"barrio": b, "total": len(v)}
            for b, v in por_barrio.items()
        ],
        key=lambda x: x["total"],
        reverse=True
    )

    return data[:limit]


@app.get("/insights/resumen")
def resumen():
    total = len(accidentes)

    barrios = len(por_barrio)

    gravedades = {}

    for a in accidentes:
        g = str(a.get("gravedad") or "").lower()
        if g:
            gravedades[g] = gravedades.get(g, 0) + 1

    return {
        "total_accidentes": total,
        "total_barrios_afectados": barrios,
        "distribucion_gravedad": gravedades
    }


@app.get("/insights/tendencia-fecha")
def tendencia_fecha():
    conteo = {}

    for a in accidentes:
        fecha = a.get("fecha")

        if fecha:
            conteo[fecha] = conteo.get(fecha, 0) + 1

    return conteo


# =========================
# TIEMPO REAL SIMULADO
# =========================

# Endpoint: stream de accidentes recientes
@app.get("/realtime/accidentes")
def realtime_accidentes(limit: int = 10):
    # simula “flujo en vivo”
    muestra = random.sample(accidentes, min(limit, len(accidentes)))

    return {
        "timestamp": time.time(),
        "data": muestra
    }

# Estado en vivo del sistema
@app.get("/realtime/estado")
def estado_sistema():
    return {
        "timestamp": time.time(),
        "total_accidentes": len(accidentes),
        "ultimos_registros": random.randint(5, 20),
        "estado": "activo",
        "nivel_saturacion": random.choice(["bajo", "medio", "alto"])
    }


# Endpoint: simulación de flujo por segundo
@app.get("/realtime/flujo")
def flujo():
    return [
        {
            "id": i,
            "lat": float(a.get("latitud", 0)),
            "lon": float(a.get("longitud", 0)),
            "evento": "accidente",
            "intensidad": random.randint(1, 5),
            "timestamp": time.time()
        }
        for i, a in enumerate(random.sample(accidentes, min(15, len(accidentes))))
    ]


# Alerta automatica
@app.get("/realtime/alerta")
def alerta():
    return {
        "alerta": random.choice(["zona de riesgo alta", "flujo normal"]),
        "nivel": random.randint(1, 10)
    }