"""Tests du CRUD commerçant : boutiques, produits et prix."""


def test_creer_boutique(client, commerce_headers):
    response = client.post(
        "/api/v1/stores",
        json={
            "name": "Ma Boutique CRUD",
            "description": "Boutique creee via l'API.",
            "city": "Yaounde",
            "latitude": 3.87,
            "longitude": 11.52,
            "opening_hours": "8h-18h",
        },
        headers=commerce_headers,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Ma Boutique CRUD"
    assert data["owner_id"] is not None
    assert data["is_active"] is True


def test_creer_boutique_roles(client, auth_headers):
    """Un client n'a pas le droit de creer une boutique."""
    response = client.post(
        "/api/v1/stores",
        json={"name": "Hop la"},
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_creer_boutique_sans_token(client):
    response = client.post("/api/v1/stores", json={"name": "Hop la"})
    assert response.status_code == 401


def test_liste_mes_boutiques(client, commerce_headers):
    client.post(
        "/api/v1/stores",
        json={"name": "Boutique Liste 1", "city": "Douala"},
        headers=commerce_headers,
    )
    response = client.get("/api/v1/stores", headers=commerce_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_modifier_boutique(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique A Modifier"},
        headers=commerce_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/stores/{store_id}",
        json={"city": "Bafoussam", "opening_hours": "9h-19h"},
        headers=commerce_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["city"] == "Bafoussam"
    assert data["opening_hours"] == "9h-19h"


def test_modifier_boutique_d_autrui(client, commerce_headers, auth_headers):
    """Un client ne peut pas modifier une boutique qui ne lui appartient pas."""
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Protegee"},
        headers=commerce_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/stores/{store_id}",
        json={"name": "Piratage"},
        headers=auth_headers,
    )
    assert response.status_code == 403


def test_supprimer_boutique(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique A Supprimer"},
        headers=commerce_headers,
    ).json()["id"]
    response = client.delete(f"/api/v1/stores/{store_id}", headers=commerce_headers)
    assert response.status_code == 204
    # La boutique est soft-deleted : fiche publique 404
    assert client.get(f"/api/v1/stores/{store_id}").status_code == 404


def test_ajouter_produit_et_prix(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Produits"},
        headers=commerce_headers,
    ).json()["id"]

    product = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "Clavier AZERTY", "description": "Clavier neuf.", "brand": "Logitech"},
        headers=commerce_headers,
    )
    assert product.status_code == 201, product.text
    product_id = product.json()["id"]

    price = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 25000, "is_available": True},
        headers=commerce_headers,
    )
    assert price.status_code == 201, price.text
    assert price.json()["amount"] == 25000

    # La recherche publique trouve le produit avec son prix
    search = client.get("/api/v1/products", params={"search": "clavier"})
    assert search.status_code == 200
    items = search.json()["items"]
    assert any(i["id"] == product_id for i in items)

    # Le client peut confirmer ce prix
    price_id = price.json()["id"]
    confirm = client.post(
        f"/api/v1/prices/{price_id}/confirm",
        headers=auth_headers_factory(client),
    )
    assert confirm.status_code == 200
    assert confirm.json()["confirmed_count"] == 1


def test_ajouter_prix_produit_invalide(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Prix Invalide"},
        headers=commerce_headers,
    ).json()["id"]
    response = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": 999999},
        json={"amount": 1000},
        headers=commerce_headers,
    )
    assert response.status_code == 404


def test_mettre_a_jour_prix(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Prix Update"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "Souris"},
        headers=commerce_headers,
    ).json()["id"]
    price_id = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 5000},
        headers=commerce_headers,
    ).json()["id"]

    response = client.patch(
        f"/api/v1/prices/{price_id}",
        json={"amount": 4500, "is_available": False},
        headers=commerce_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 4500
    assert data["is_available"] is False


def test_supprimer_prix(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Prix Delete"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "Cable HDMI"},
        headers=commerce_headers,
    ).json()["id"]
    price_id = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 3000},
        headers=commerce_headers,
    ).json()["id"]
    response = client.delete(f"/api/v1/prices/{price_id}", headers=commerce_headers)
    assert response.status_code == 204


def test_modifier_produit(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Produit Update"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "Batterie"},
        headers=commerce_headers,
    ).json()["id"]
    client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 10000},
        headers=commerce_headers,
    )
    response = client.patch(
        f"/api/v1/stores/products/{product_id}",
        json={"brand": "Samsung"},
        headers=commerce_headers,
    )
    assert response.status_code == 200
    assert response.json()["brand"] == "Samsung"


def test_supprimer_produit(client, commerce_headers):
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Produit Delete"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "RAM 8 Go"},
        headers=commerce_headers,
    ).json()["id"]
    client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 20000},
        headers=commerce_headers,
    )
    response = client.delete(
        f"/api/v1/stores/products/{product_id}", headers=commerce_headers
    )
    assert response.status_code == 204
    assert client.get(f"/api/v1/products/{product_id}").status_code == 404


def test_prix_d_une_boutique_d_autrui(client, commerce_headers, auth_headers):
    """Le client ne doit pas pouvoir modifier un prix d'une boutique d'autrui."""
    store_id = client.post(
        "/api/v1/stores",
        json={"name": "Boutique Autrui"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": "Ecran"},
        headers=commerce_headers,
    ).json()["id"]
    price_id = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 35000},
        headers=commerce_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/prices/{price_id}",
        json={"amount": 1},
        headers=auth_headers,
    )
    assert response.status_code == 403


def auth_headers_factory(client):
    """Helper local : cree un client connecte et retourne ses headers."""
    import uuid

    email = f"client_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "motdepasse123", "role": "CLIENT"},
    )
    resp = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "motdepasse123"}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}