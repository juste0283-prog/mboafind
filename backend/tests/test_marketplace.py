"""Vitrine Marketplace : categories, tri prix/fraicheur et bons plans."""


def _get(client, **params):
    response = client.get("/api/v1/marketplace", params=params or None)
    assert response.status_code == 200, response.text
    return response.json()


def _create_product(client, store_id, headers, name, category_id=None):
    response = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": name, "category_id": category_id} if category_id else {"name": name},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _set_price(client, store_id, product_id, headers, amount):
    response = client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": amount, "is_available": True},
        headers=headers,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_marketplace_liste_categories_et_produits(client, demo_catalog, commerce_headers):
    data = _get(client)
    assert data["total"] >= 1
    assert len(data["categories"]) >= 1
    assert any(c["id"] == demo_catalog["category_id"] and c["count"] >= 1 for c in data["categories"])
    assert any(p["id"] == demo_catalog["product_id"] for p in data["items"])


def test_marketplace_tri_prix_croissant_defaut(client, demo_catalog, commerce_headers):
    data = _get(client)
    min_values = [float(p["min_price"]) for p in data["items"] if p["min_price"] is not None]
    assert min_values == sorted(min_values)


def test_marketplace_filtre_par_categorie(client, demo_catalog, commerce_headers):
    data = _get(client, category_id=demo_catalog["category_id"])
    assert any(p["category"]["id"] == demo_catalog["category_id"] for p in data["items"])
    assert all(p["category"]["id"] == demo_catalog["category_id"] for p in data["items"])


def test_marketplace_pagination(client, demo_catalog, commerce_headers):
    page1 = _get(client, page_size=1, sort="recent")
    assert page1["total"] >= 1
    assert len(page1["items"]) == 1
    assert page1["page"] == 1
    assert page1["page_size"] == 1


def test_marketplace_detecte_les_bons_plans(client, demo_catalog, commerce_headers):
    product = _create_product(
        client,
        demo_catalog["store_id"],
        commerce_headers,
        "Television - Bon Plan",
        demo_catalog["category_id"],
    )
    _set_price(client, demo_catalog["store_id"], product["id"], commerce_headers, 50000)
    # Baisse de 20 % : 40000 au lieu de 50000.
    _set_price(client, demo_catalog["store_id"], product["id"], commerce_headers, 40000)

    data = _get(client, sort="deals")
    deal = next((p for p in data["items"] if p["id"] == product["id"]), None)
    assert deal is not None, "Le produit en baisse doit apparaitre dans les bons plans"
    assert deal["deal_drop_percent"] == 20.0
    # Les produits en baisse arrivent avant ceux sans baisse.
    first = data["items"][0]
    assert first["deal_drop_percent"] is not None


def test_marketplace_sans_baisse_details(client, demo_catalog, commerce_headers):
    product = _create_product(
        client,
        demo_catalog["store_id"],
        commerce_headers,
        "Produit Stable",
        demo_catalog["category_id"],
    )
    _set_price(client, demo_catalog["store_id"], product["id"], commerce_headers, 10000)

    data = _get(client)
    item = next((p for p in data["items"] if p["id"] == product["id"]), None)
    assert item is not None
    # Aucun historique de baisse : deal_drop_percent reste nul.
    assert item["deal_drop_percent"] is None