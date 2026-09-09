"""Tests du catalogue client : categories, recherche, fiches, prix."""


def test_categories(client, demo_catalog):
    """La liste des categories est publique et contient la categorie de test."""
    response = client.get("/api/v1/categories")
    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert any(c["slug"] == "informatique" for c in body)


def test_search_products(client, demo_catalog):
    """La recherche retourne le produit de test avec ses statistiques de prix."""
    response = client.get("/api/v1/products", params={"search": "ssd"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    item = next(p for p in body["items"] if p["slug"] == "ssd-512-go-test")
    assert item["min_price"] == 38000.0
    assert item["max_price"] == 40000.0
    assert item["store_count"] >= 1


def test_search_filters_ville(client, demo_catalog):
    """Le filtre ville restreint les resultats."""
    response = client.get(
        "/api/v1/products",
        params={"search": "ssd", "city": "Douala"},
    )
    assert response.status_code == 200
    # Aucune offre du produit de test n'est a Douala (2e boutique sans prix).
    assert response.json()["total"] == 0


def test_search_tri_prix(client, demo_catalog):
    """Le tri par prix croissant fonctionne."""
    response = client.get("/api/v1/products", params={"search": "ssd", "sort": "price_asc"})
    assert response.status_code == 200
    items = response.json()["items"]
    prices = [p["min_price"] for p in items if p["min_price"] is not None]
    assert prices == sorted(prices)


def test_product_detail(client, demo_catalog):
    """La fiche produit liste les offres triees (disponibles d'abord)."""
    response = client.get(f"/api/v1/products/{demo_catalog['product_id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "ssd-512-go-test"
    assert body["min_price"] == 38000.0
    assert len(body["offers"]) == 2
    assert body["offers"][0]["store_name"] == "Boutique Test"


def test_product_detail_absent(client):
    """Une fiche produit inconnue renvoie 404."""
    response = client.get("/api/v1/products/999999")
    assert response.status_code == 404


def test_store_detail(client, demo_catalog):
    """La fiche boutique contient ses produits et sa note publique."""
    response = client.get(f"/api/v1/stores/{demo_catalog['store_id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Boutique Test"
    assert body["city"] == "Yaoundé"
    assert body["latitude"] is not None
    assert any(p["slug"] == "ssd-512-go-test" for p in body["products"])


def test_confirm_price_requiert_auth(client, demo_catalog):
    """La confirmation d'un prix exige un client connecte."""
    price_id = demo_catalog["price_ids"][0]
    response = client.post(f"/api/v1/prices/{price_id}/confirm")
    assert response.status_code == 401


def test_confirm_price(client, auth_headers, demo_catalog):
    """Un client connecte confirme un prix (compteur et date maj)."""
    price_id = demo_catalog["price_ids"][0]
    response = client.post(
        f"/api/v1/prices/{price_id}/confirm", headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["price_id"] == price_id
    assert body["confirmed_count"] >= 1
    assert body["last_confirmed_at"] is not None