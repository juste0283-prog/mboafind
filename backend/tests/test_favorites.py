"""Tests des favoris (produits, boutiques, professionnels)."""


def test_add_favorite_product(client, auth_headers, demo_catalog):
    """Un client met un produit en favori (avec le nom retourne)."""
    response = client.post(
        "/api/v1/favorites",
        headers=auth_headers,
        json={"item_type": "PRODUCT", "item_id": demo_catalog["product_id"]},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["item_type"] == "PRODUCT"
    assert body["item_id"] == demo_catalog["product_id"]
    assert body["item_name"] == "SSD 512 Go Test"


def test_add_favorite_idempotent(client, auth_headers, demo_catalog):
    """Ajouter deux fois le meme favori ne cree pas de doublon."""
    payload = {"item_type": "STORE", "item_id": demo_catalog["store_id"]}
    first = client.post("/api/v1/favorites", headers=auth_headers, json=payload)
    second = client.post("/api/v1/favorites", headers=auth_headers, json=payload)
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    listed = client.get("/api/v1/favorites", headers=auth_headers).json()
    stores = [f for f in listed if f["item_type"] == "STORE"]
    assert len(stores) == 1


def test_favorite_cible_absente(client, auth_headers):
    """Ajouter en favori une cible inexistante renvoie 404."""
    response = client.post(
        "/api/v1/favorites",
        headers=auth_headers,
        json={"item_type": "PRODUCT", "item_id": 999999},
    )
    assert response.status_code == 404


def test_favorite_status(client, auth_headers, demo_catalog):
    """L'etat du favori est consultable via /favorites/status."""
    assert (
        client.get(
            "/api/v1/favorites/status",
            headers=auth_headers,
            params={"item_type": "STORE", "item_id": demo_catalog["store2_id"]},
        ).json()["is_favorite"]
        is False
    )
    client.post(
        "/api/v1/favorites",
        headers=auth_headers,
        json={"item_type": "STORE", "item_id": demo_catalog["store2_id"]},
    )
    assert (
        client.get(
            "/api/v1/favorites/status",
            headers=auth_headers,
            params={"item_type": "STORE", "item_id": demo_catalog["store2_id"]},
        ).json()["is_favorite"]
        is True
    )


def test_list_favorites_puise_filtre(client, auth_headers, demo_catalog, demo_professional):
    """La liste des favoris est filtrable par type."""
    client.post(
        "/api/v1/favorites",
        headers=auth_headers,
        json={"item_type": "PROFESSIONAL", "item_id": demo_professional["professional_id"]},
    )
    response = client.get(
        "/api/v1/favorites", headers=auth_headers, params={"item_type": "PROFESSIONAL"}
    )
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["item_name"] != None


def test_remove_favorite(client, auth_headers, demo_catalog):
    """Retirer un favori fonctionne (et est idempotent)."""
    item_id = demo_catalog["store2_id"]
    client.post(
        "/api/v1/favorites", headers=auth_headers, json={"item_type": "STORE", "item_id": item_id}
    )
    delete = client.delete(f"/api/v1/favorites/STORE/{item_id}", headers=auth_headers)
    assert delete.status_code == 204
    assert client.delete(f"/api/v1/favorites/STORE/{item_id}", headers=auth_headers).status_code == 204

    listed = client.get("/api/v1/favorites", headers=auth_headers).json()
    assert all(f["item_id"] != item_id for f in listed)


def test_favorites_requiert_auth(client):
    """Les favoris exigent un utilisateur connecte."""
    assert client.get("/api/v1/favorites").status_code == 401
    assert (
        client.post("/api/v1/favorites", json={"item_type": "PRODUCT", "item_id": 1}).status_code
        == 401
    )