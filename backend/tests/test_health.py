import pytest


class TestHealth:
    async def test_health(self, client):
        resp = await client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert data["app"] == "Transporte y Riesgos"

    async def test_info(self, client):
        resp = await client.get("/api/info")
        assert resp.status_code == 200
        data = resp.json()
        assert data["version"] == "2.0.0"
        assert "endpoints" in data
        assert isinstance(data["endpoints"], dict)


class TestRoot:
    async def test_root(self, client):
        resp = await client.get("/")
        assert resp.status_code == 200

    async def test_root_no_auth(self, client):
        resp = await client.get("/")
        assert resp.status_code == 200
