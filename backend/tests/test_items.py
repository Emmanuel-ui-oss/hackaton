import pytest


class TestZonasRiesgo:
    async def test_list_zonas_empty(self, client, auth_headers):
        resp = await client.get("/api/v1/zonas-riesgo", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_zona(self, client, auth_headers, zona_riesgo_data):
        resp = await client.post("/api/v1/zonas-riesgo", headers=auth_headers, json=zona_riesgo_data)
        assert resp.status_code == 201
        data = resp.json()
        assert data["nombre"] == zona_riesgo_data["nombre"]
        assert data["nivel"] == "ALTO"

    async def test_create_zona_forbidden_non_staff(self, client, auth_headers):
        from asgiref.sync import sync_to_async
        from django.contrib.auth.models import User
        import jwt
        from django.conf import settings
        from datetime import datetime, timedelta, timezone as tz
        non_staff = await sync_to_async(User.objects.create_user)(
            username="regular", password="pass123", email="reg@test.com", is_staff=False
        )
        token = jwt.encode({"user_id": non_staff.id, "exp": datetime.now(tz.utc) + timedelta(days=1)}, settings.SECRET_KEY, algorithm="HS256")
        headers = {"Authorization": f"Bearer {token}"}
        resp = await client.post("/api/v1/zonas-riesgo", headers=headers, json={
            "nombre": "Sin permisos",
            "latitud": 6.2,
            "longitud": -75.5,
        })
        assert resp.status_code == 403

    async def test_get_zona(self, client, auth_headers, zona_riesgo_data):
        create = await client.post("/api/v1/zonas-riesgo", headers=auth_headers, json=zona_riesgo_data)
        zona_id = create.json()["id"]
        resp = await client.get(f"/api/v1/zonas-riesgo/{zona_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["nombre"] == zona_riesgo_data["nombre"]

    async def test_update_zona(self, client, auth_headers, zona_riesgo_data):
        create = await client.post("/api/v1/zonas-riesgo", headers=auth_headers, json=zona_riesgo_data)
        zona_id = create.json()["id"]
        resp = await client.put(f"/api/v1/zonas-riesgo/{zona_id}", headers=auth_headers, json={
            "nombre": "Zona Actualizada",
            "nivel": "CRITICO",
        })
        assert resp.status_code == 200
        assert resp.json()["nombre"] == "Zona Actualizada"
        assert resp.json()["nivel"] == "CRITICO"

    async def test_delete_zona(self, client, auth_headers, zona_riesgo_data):
        create = await client.post("/api/v1/zonas-riesgo", headers=auth_headers, json=zona_riesgo_data)
        zona_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/zonas-riesgo/{zona_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_get_nonexistent_zona(self, client, auth_headers):
        resp = await client.get("/api/v1/zonas-riesgo/99999", headers=auth_headers)
        assert resp.status_code == 404


class TestReportes:
    async def test_list_reportes_empty(self, client, auth_headers):
        resp = await client.get("/api/v1/reportes", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    async def test_create_reporte(self, client, auth_headers):
        resp = await client.post("/api/v1/reportes", headers=auth_headers, json={
            "tipo": "accidente",
            "descripcion": "Test reporte",
            "latitud": 6.2442,
            "longitud": -75.5812,
        })
        assert resp.status_code == 201
        assert resp.json()["tipo"] == "accidente"

    async def test_list_reportes_after_create(self, client, auth_headers):
        await client.post("/api/v1/reportes", headers=auth_headers, json={
            "tipo": "bloqueo",
            "descripcion": "Bloqueo test",
            "latitud": 6.25,
            "longitud": -75.57,
        })
        resp = await client.get("/api/v1/reportes", headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    async def test_stats_endpoint(self, client, auth_headers):
        resp = await client.get("/api/v1/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_reportes" in data
        assert "zonas_riesgo" in data
