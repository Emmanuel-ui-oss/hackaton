import pytest


class TestZonasRiesgo:
    async def test_list_zonas(self, client, auth_headers, zona_riesgo):
        resp = await client.get("/api/v1/zonas-riesgo", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 1
        assert data["data"][0]["nombre"] == "Test Zona"

    async def test_list_zonas_filter(self, client, auth_headers, zona_riesgo):
        resp = await client.get("/api/v1/zonas-riesgo?nivel=ALTO", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1

        resp = await client.get("/api/v1/zonas-riesgo?nivel=BAJO", headers=auth_headers)
        assert len(resp.json()["data"]) == 0

    async def test_create_zona(self, client, auth_headers):
        resp = await client.post("/api/v1/zonas-riesgo", headers=auth_headers, json={
            "nombre": "Nueva Zona",
            "comuna": "Comuna 13",
            "descripcion": "Zona de prueba",
            "tipo_riesgo": "INUNDACION",
            "nivel": "CRITICO",
            "latitud": 6.25,
            "longitud": -75.58,
            "radio_metros": 1000,
        })
        assert resp.status_code == 201
        assert resp.json()["nombre"] == "Nueva Zona"

    async def test_get_zona(self, client, auth_headers, zona_riesgo):
        resp = await client.get(f"/api/v1/zonas-riesgo/{zona_riesgo.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Test Zona"


class TestReportes:
    async def test_list_reportes(self, client, auth_headers, reporte):
        resp = await client.get("/api/v1/reportes", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) >= 1

    async def test_crear_reporte(self, client, auth_headers):
        resp = await client.post("/api/v1/reportes", headers=auth_headers, json={
            "tipo": "ROBO",
            "descripcion": "Robo en la esquina",
            "ubicacion_texto": "Calle 10 #20-30",
            "latitud": 6.23,
            "longitud": -75.59,
        })
        assert resp.status_code == 201
        assert resp.json()["tipo"] == "ROBO"

    async def test_votar_reporte(self, client, auth_headers, reporte):
        resp = await client.post(
            f"/api/v1/reportes/{reporte.id}/votar",
            headers=auth_headers,
            json={"positivo": True},
        )
        assert resp.status_code == 200
        assert resp.json()["votos_positivos"] == 1

    async def test_votar_twice(self, client, auth_headers, reporte):
        await client.post(
            f"/api/v1/reportes/{reporte.id}/votar",
            headers=auth_headers,
            json={"positivo": True},
        )
        resp = await client.post(
            f"/api/v1/reportes/{reporte.id}/votar",
            headers=auth_headers,
            json={"positivo": False},
        )
        assert resp.status_code == 200
        assert resp.json()["votos_positivos"] == 0
        assert resp.json()["votos_negativos"] == 1


class TestFavoritos:
    async def test_list_favoritos(self, client, auth_headers):
        resp = await client.get("/api/v1/favoritos", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_crear_favorito(self, client, auth_headers):
        resp = await client.post("/api/v1/favoritos", headers=auth_headers, json={
            "nombre": "Mi Casa",
            "direccion": "Calle 50 #40-30",
            "latitud": 6.24,
            "longitud": -75.58,
        })
        assert resp.status_code == 201
        assert resp.json()["nombre"] == "Mi Casa"


class TestContactos:
    async def test_list_contactos(self, client, auth_headers):
        resp = await client.get("/api/v1/contactos-emergencia", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    async def test_crear_contacto(self, client, auth_headers):
        resp = await client.post("/api/v1/contactos-emergencia", headers=auth_headers, json={
            "nombre": "Maria",
            "telefono": "3001234567",
            "email": "maria@example.com",
        })
        assert resp.status_code == 201
        assert resp.json()["nombre"] == "Maria"


class TestSearch:
    async def test_search(self, client, auth_headers, zona_riesgo):
        resp = await client.get("/api/v1/search?q=Test", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) > 0

    async def test_search_short_query(self, client, auth_headers):
        resp = await client.get("/api/v1/search?q=a", headers=auth_headers)
        assert resp.status_code == 422


class TestStats:
    async def test_stats(self, client, auth_headers, zona_riesgo, reporte):
        resp = await client.get("/api/v1/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "zonas_riesgo" in data
        assert data["zonas_riesgo"] >= 1
        assert "reportes_comunitarios" in data
