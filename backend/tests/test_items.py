import pytest


class TestItems:
    async def test_list_items_empty(self, client, auth_headers):
        resp = await client.get("/api/v1/items", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["data"] == []
        assert data["meta"]["total"] == 0

    async def test_create_item(self, client, auth_headers):
        resp = await client.post("/api/v1/items", headers=auth_headers, json={
            "codigo": "TEST001",
            "descripcion": "Test item",
            "valor": 100.50,
            "peso_kg": 10.5,
            "origen": "Medellin",
            "destino": "Bogota",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["codigo"] == "TEST001"
        assert data["descripcion"] == "Test item"
        assert data["estado"] == "PENDIENTE"

    async def test_create_item_missing_fields(self, client, auth_headers):
        resp = await client.post("/api/v1/items", headers=auth_headers, json={
            "descripcion": "Missing codigo",
        })
        assert resp.status_code == 422

    async def test_get_item(self, client, auth_headers):
        create = await client.post("/api/v1/items", headers=auth_headers, json={
            "codigo": "TEST002",
            "descripcion": "Get test",
            "valor": 200,
            "peso_kg": 5,
            "origen": "A",
            "destino": "B",
        })
        item_id = create.json()["id"]
        resp = await client.get(f"/api/v1/items/{item_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["codigo"] == "TEST002"

    async def test_update_item(self, client, auth_headers):
        create = await client.post("/api/v1/items", headers=auth_headers, json={
            "codigo": "TEST003",
            "descripcion": "Update test",
            "valor": 300,
            "peso_kg": 1,
            "origen": "X",
            "destino": "Y",
        })
        item_id = create.json()["id"]
        resp = await client.put(f"/api/v1/items/{item_id}", headers=auth_headers, json={
            "descripcion": "Updated desc",
            "estado": "TRANSITO",
        })
        assert resp.status_code == 200
        assert resp.json()["descripcion"] == "Updated desc"
        assert resp.json()["estado"] == "TRANSITO"

    async def test_delete_item(self, client, auth_headers):
        create = await client.post("/api/v1/items", headers=auth_headers, json={
            "codigo": "TEST004",
            "descripcion": "Delete test",
            "valor": 400,
            "peso_kg": 2,
            "origen": "M",
            "destino": "N",
        })
        item_id = create.json()["id"]
        resp = await client.delete(f"/api/v1/items/{item_id}", headers=auth_headers)
        assert resp.status_code == 204

    async def test_get_nonexistent_item(self, client, auth_headers):
        resp = await client.get("/api/v1/items/99999", headers=auth_headers)
        assert resp.status_code == 404

    async def test_pagination(self, client, auth_headers):
        for i in range(5):
            await client.post("/api/v1/items", headers=auth_headers, json={
                "codigo": f"PAG{i:03d}",
                "descripcion": f"Item {i}",
                "valor": i * 100,
                "peso_kg": 1,
                "origen": "O",
                "destino": "D",
            })
        resp = await client.get("/api/v1/items?page=1&limit=2", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["data"]) == 2
        assert data["meta"]["total"] == 5
        assert data["meta"]["page"] == 1
        assert data["meta"]["limit"] == 2
        assert data["meta"]["pages"] == 3
