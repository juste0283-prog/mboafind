"""Tests des routes de sante (/api/v1)."""


def test_health(client):
    """Le ping de sante repond 200 avec un statut ok."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_root(client):
    """La racine expose le nom et la version de l'API."""
    response = client.get("/api/v1/")
    assert response.status_code == 200
    body = response.json()
    assert "name" in body
    assert "docs" in body


def test_openapi(client):
    """La documentation OpenAPI est servie (schema valide)."""
    response = client.get("/docs")
    assert response.status_code == 200
    schema = client.get("/api/v1/openapi.json")
    assert schema.status_code == 200
    assert "paths" in schema.json()