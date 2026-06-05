import pytest


class TestInfo:
    async def test_info(self, client, auth_headers):
        resp = await client.get("/api/v1/info", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "network" in data
        assert "hostname" in data["network"]


class TestRoot:
    async def test_root(self, client):
        resp = await client.get("/")
        assert resp.status_code in (200, 404)

    async def test_root_no_auth(self, client):
        resp = await client.get("/")
        assert resp.status_code in (200, 404)
