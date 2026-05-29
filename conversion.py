import pandas as pd

df = pd.read_excel("MUERTOS_2021.xlsx")

# =========================
# Selección de columnas
# =========================
df = df[
    [
        "fecha",
        "hora",
        "clase",
        "direccion",
        "gravedad",
        "barrio",
        "comuna",
        "latitud",
        "longitud"
    ]
]

# =========================
# LIMPIEZA DE DATOS (AQUÍ VA LO QUE PREGUNTAS)
# =========================

df["barrio"] = df["barrio"].fillna("")
df["gravedad"] = df["gravedad"].fillna("")

# 🔥 AQUÍ VA EXACTAMENTE LO QUE PREGUNTAS
df["latitud"] = pd.to_numeric(df["latitud"], errors="coerce").fillna(0)
df["longitud"] = pd.to_numeric(df["longitud"], errors="coerce").fillna(0)

# =========================
# EXPORTAR A JSON
# =========================
df.to_json(
    "accidentes.json",
    orient="records",
    force_ascii=False,
    indent=4
)

print("JSON creado correctamente")