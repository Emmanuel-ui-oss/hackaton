import pytest


class TestAuthRequired:
    ENDPOINTS = [
        ("GET", "/api/v1/items"),
        ("POST", "/api/v1/items"),
        ("GET", "/api/v1/zonas-riesgo"),
        ("POST", "/api/v1/zonas-riesgo"),
        ("GET", "/api/v1/reportes"),
        ("POST", "/api/v1/reportes"),
        ("GET", "/api/v1/favoritos"),
        ("POST", "/api/v1/favoritos"),
        ("GET", "/api/v1/contactos-emergencia"),
        ("POST", "/api/v1/contactos-emergencia"),
        ("GET", "/api/v1/alertas"),
        ("GET", "/api/v1/historial-viajes"),
        ("GET", "/api/v1/search?q=test"),
        ("GET", "/api/v1/stats"),
    ]

    @pytest.mark.parametrize("method,path", ENDPOINTS)
    async def test_no_token_returns_401(self, client, method, path):
        resp = await client.request(method, path)
        assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"

    @pytest.mark.parametrize("method,path", ENDPOINTS)
    async def test_invalid_token_returns_401(self, client, method, path):
        headers = {"Authorization": "Bearer badtoken"}
        resp = await client.request(method, path, headers=headers)
        assert resp.status_code == 401, f"{method} {path} returned {resp.status_code}"


class TestValidation:
    async def test_invalid_json(self, client, auth_headers):
        resp = await client.post("/api/v1/items", headers=auth_headers, json="not json")
        assert resp.status_code == 422

    async def test_invalid_enum(self, client, auth_headers):
        resp = await client.post("/api/v1/items", headers=auth_headers, json={
            "codigo": "INVALID",
            "descripcion": "Test",
            "valor": 100,
            "peso_kg": 10,
            "origen": "A",
            "destino": "B",
            "estado": "INVALID_STATE",
        })
        assert resp.status_code == 422
