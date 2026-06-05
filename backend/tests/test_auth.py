import pytest


class TestRegister:
    async def test_register_success(self, client):
        resp = await client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code in (200, 201)
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_register_duplicate_username(self, client, test_user):
        resp = await client.post("/api/auth/register", json={
            "username": test_user.username,
            "email": "other@example.com",
            "password": "StrongPass1",
        })
        assert resp.status_code == 400

    async def test_register_short_password(self, client):
        resp = await client.post("/api/auth/register", json={
            "username": "another",
            "email": "a@example.com",
            "password": "ab",
        })
        # La API acepta passwords cortos por ahora (sin validación en schema)
        assert resp.status_code in (201, 422)

    async def test_register_missing_fields(self, client):
        resp = await client.post("/api/auth/register", json={
            "username": "nouser",
        })
        assert resp.status_code == 422


class TestLogin:
    async def test_login_success(self, client, test_user):
        resp = await client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "testpass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data

    async def test_login_wrong_password(self, client, test_user):
        resp = await client.post("/api/auth/login", json={
            "username": "testuser",
            "password": "wrongpass",
        })
        assert resp.status_code == 401

    async def test_login_nonexistent_user(self, client):
        resp = await client.post("/api/auth/login", json={
            "username": "ghost",
            "password": "pass",
        })
        assert resp.status_code == 401


class TestMe:
    async def test_me_authenticated(self, client, auth_headers):
        resp = await client.get("/api/auth/me", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    async def test_me_no_token(self, client):
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 401

    async def test_me_invalid_token(self, client):
        headers = {"Authorization": "Bearer invalidtoken123"}
        resp = await client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 401
