"""Tests des signalements cote client."""


def test_create_report(client, auth_headers, demo_catalog):
    """Un utilisateur signale un prix incorrect (statut ''nouveau'')."""
    price_id = demo_catalog["price_ids"][0]
    response = client.post(
        "/api/v1/reports",
        headers=auth_headers,
        json={
            "target_type": "PRICE",
            "target_id": price_id,
            "reason": "Le prix affiche ne correspond pas au prix en boutique",
            "description": "Vu 45000 FCFA sur place alors que 38000 est affiche.",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["target_type"] == "PRICE"
    assert body["target_id"] == price_id
    assert body["status"] == "PENDING"


def test_create_report_sans_auth(client, demo_catalog):
    """Signaler sans connexion renvoie 401."""
    response = client.post(
        "/api/v1/reports",
        json={
            "target_type": "PRICE",
            "target_id": demo_catalog["price_ids"][0],
            "reason": "test",
        },
    )
    assert response.status_code == 401


def test_create_report_cible_absente(client, auth_headers):
    """Signaler une cible inexistante renvoie 404."""
    response = client.post(
        "/api/v1/reports",
        headers=auth_headers,
        json={"target_type": "STORE", "target_id": 999999, "reason": "Boutique fermee"},
    )
    assert response.status_code == 404


def test_list_my_reports(client, auth_headers, demo_catalog):
    """L'historique des signalements de l'utilisateur est consultable."""
    response = client.get("/api/v1/reports/mine", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1