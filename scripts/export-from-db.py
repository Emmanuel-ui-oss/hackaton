import sqlite3, json, os

DB = os.path.join(os.path.dirname(__file__), '..', 'backend', 'db.sqlite3')
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'routes')

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row

routes = list(conn.execute(
    "SELECT codigo, nombre, tipo, color, ruta_geojson, paradas FROM core_rutatransporte WHERE activo=1"
))

groups = {'bus': [], 'metro': [], 'cable': [], 'tranvia': []}
mapping = {'bus': 'bus', 'metro': 'metro', 'metro_cable': 'cable', 'tranvia': 'tranvia'}

for r in routes:
    tipo = r['tipo']
    key = mapping.get(tipo, tipo)
    ruta_geojson = json.loads(r['ruta_geojson']) if isinstance(r['ruta_geojson'], str) else r['ruta_geojson']
    paradas = json.loads(r['paradas']) if isinstance(r['paradas'], str) else r['paradas']
    entry = {
        'nombre': r['nombre'],
        'tipo': tipo,
        'codigo': r['codigo'],
        'color': r['color'],
        'ruta_geojson': ruta_geojson,
        'paradas': paradas,
    }
    groups.setdefault(key, []).append(entry)

os.makedirs(OUT, exist_ok=True)

for filename in set(mapping.values()):
    data = groups.get(filename, [])
    fp = os.path.join(OUT, f'{filename}.json')
    with open(fp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f'{filename}.json: {len(data)} rutas')

# Combined file
all_routes = []
for group in groups.values():
    all_routes.extend(group)
fp_all = os.path.join(os.path.dirname(__file__), '..', 'data', 'transporte.json')
with open(fp_all, 'w', encoding='utf-8') as f:
    json.dump(all_routes, f, ensure_ascii=False, indent=2)
print(f'\ntransporte.json: {len(all_routes)} rutas (combinado)')

# Index
summary = [{'tipo': k, 'file': f'{v}.json', 'count': len(groups.get(v, []))} for k, v in mapping.items()]
with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)
print('index.json actualizado')
