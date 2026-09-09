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


def test_confirm_price_une_fois_seulement(client, auth_headers, demo_catalog):
    """Un client ne peut pas confirmer un prix plus d'une fois.

    Une seconde tentative est idempotente : already_confirmed=True et le
    compteur de confirmations ne bouge pas.
    """
    price_id = demo_catalog["price_ids"][1]
    first = client.post(f"/api/v1/prices/{price_id}/confirm", headers=auth_headers)
    assert first.status_code == 200
    assert first.json()["already_confirmed"] is False
    first_count = first.json()["confirmed_count"]

    second = client.post(f"/api/v1/prices/{price_id}/confirm", headers=auth_headers)
    assert second.status_code == 200
    body = second.json()
    assert body["already_confirmed"] is True
    assert body["confirmed_count"] == first_count
    assert body["message"] == "Vous avez deja confirme ce prix."


def test_product_detail_confirmed_by_me(client, auth_headers, demo_catalog):
    """La fiche produit signale les prix deja confirmes par l'utilisateur."""
    price_id = demo_catalog["price_ids"][0]
    response = client.post(f"/api/v1/prices/{price_id}/confirm", headers=auth_headers)
    assert response.status_code == 200

    detail = client.get(
        f"/api/v1/products/{demo_catalog['product_id']}", headers=auth_headers
    )
    assert detail.status_code == 200
    offers = detail.json()["offers"]
    confirmed = [o for o in offers if o["confirmed_by_me"]]
    assert any(o["id"] == price_id for o in confirmed)
    # Un visiteur anonyme ne voit jamais confirmed_by_me a True.
    anonymous = client.get(f"/api/v1/products/{demo_catalog['product_id']}")
    assert all(o["confirmed_by_me"] is False for o in anonymous.json()["offers"])


def test_product_detail_trust_score(client, demo_catalog):
    """Chaque offre expose un score de confiance 0-100."""
    detail = client.get(f"/api/v1/products/{demo_catalog['product_id']}")
    body = detail.json()
    assert 0 <= body["offers"][0]["trust_score"] <= 100
    # Boutique verifiee + dispo + frais => score haut, pas 0.
    assert body["offers"][0]["trust_score"] >= 30


def test_price_history(client, commerce_headers, demo_catalog):
    """Chaque modification de prix laisse une trace dans l'historique."""
    price_id = demo_catalog["price_ids"][0]
    response = client.patch(
        f"/api/v1/prices/{price_id}",
        headers=commerce_headers,
        json={"amount": 42000.0},
    )
    assert response.status_code == 200, response.text

    history = client.get(f"/api/v1/prices/{price_id}/history")
    assert history.status_code == 200
    entries = history.json()
    assert len(entries) >= 1
    assert entries[0]["amount"] == 38000.0
    assert entries[0]["currency"] == "XAF"