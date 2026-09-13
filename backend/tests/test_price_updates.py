"""Tests des alertes intelligentes : notifications temps reel des prix."""


def _notifications_of(client, headers, ntype, product_name=None):
    data = client.get(
        "/api/v1/notifications", headers=headers, params={"page_size": 50}
    ).json()
    return [
        n
        for n in data["items"]
        if n["type"] == ntype
        and (product_name is None or product_name in n["message"])
    ]


def test_price_change_notifies_users(client, commerce_headers, pro_headers, demo_catalog):
    """Changer un prix notifie en temps reel les comptes abonnes (hors proprio)."""
    price_id = demo_catalog["price_ids"][0]
    before = len(
        _notifications_of(
            client, pro_headers, "price_changed", "SSD 512 Go Test"
        )
    )
    response = client.patch(
        f"/api/v1/prices/{price_id}",
        headers=commerce_headers,
        json={"amount": 37000.0},
    )
    assert response.status_code == 200, response.text

    after = _notifications_of(
        client, pro_headers, "price_changed", "SSD 512 Go Test"
    )
    assert len(after) == before + 1
    assert any("37,000" in n["message"] and "->" in n["message"] for n in after)


def test_merchant_not_notified_of_own_price(client, commerce_headers, demo_catalog):
    """Le commercant qui change son prix ne recoit pas sa propre notification."""
    price_id = demo_catalog["price_ids"][0]
    before = client.get("/api/v1/notifications", headers=commerce_headers).json()["total"]
    client.patch(
        f"/api/v1/prices/{price_id}",
        headers=commerce_headers,
        json={"amount": 36000.0},
    )
    after = client.get("/api/v1/notifications", headers=commerce_headers).json()["total"]
    assert after == before


def test_disable_price_notifications(client, commerce_headers, pro_headers, demo_catalog):
    """Couper les alertes stoppe les notifications de changement de prix."""
    client.patch(
        "/api/v1/users/me",
        headers=pro_headers,
        json={"notify_price_changes": False},
    )
    assert client.get("/api/v1/users/me", headers=pro_headers).json()[
        "notify_price_changes"
    ] is False

    price_id = demo_catalog["price_ids"][0]
    before = len(
        _notifications_of(client, pro_headers, "price_changed", "SSD 512 Go Test")
    )
    client.patch(
        f"/api/v1/prices/{price_id}",
        headers=commerce_headers,
        json={"amount": 35000.0},
    )
    after = len(
        _notifications_of(client, pro_headers, "price_changed", "SSD 512 Go Test")
    )
    assert after == before

    client.patch(
        "/api/v1/users/me",
        headers=pro_headers,
        json={"notify_price_changes": True},
    )


def test_new_price_does_not_spam(client, commerce_headers, pro_headers, demo_catalog):
    """Un nouveau prix (ajout) ne genere pas de notification de changement."""
    before = len(_notifications_of(client, pro_headers, "price_changed"))
    response = client.post(
        f"/api/v1/stores/{demo_catalog['store2_id']}/prices",
        params={"product_id": demo_catalog["product_id"]},
        headers=commerce_headers,
        json={"amount": 45000.0},
    )
    assert response.status_code == 201, response.text
    after = len(_notifications_of(client, pro_headers, "price_changed"))
    assert after == before


def test_price_updates_feed(client, demo_catalog):
    """Le flux public expose les derniers changements de prix."""
    response = client.get("/api/v1/price-updates")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["page"] == 1
    assert any(
        item["product_name"] == "SSD 512 Go Test" and item["store_name"] == "Boutique Test"
        for item in body["items"]
    )
    assert all(item["drop_percent"] >= 0.0 for item in body["items"])


def test_price_updates_feed_detail(client, demo_catalog):
    """Le flux indique la baisse relative et la valeur precedente."""
    response = client.get("/api/v1/price-updates", params={"page_size": 50})
    items = response.json()["items"]
    with_history = [i for i in items if i["previous_amount"] is not None]
    assert len(with_history) >= 1
    assert all(
        isinstance(i["drop_percent"], (int, float)) for i in with_history
    )