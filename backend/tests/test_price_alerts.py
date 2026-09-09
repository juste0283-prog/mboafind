"""Tests des alertes de prix (P1 : m'alerter sous X FCFA).

Les prix du catalogue de demo etant partages par toutes les suites (fixture
session-scoped), chaque test fixe lui-meme le prix observe avant d'agir.
"""

from app.database.session import SessionLocal
from app.models import Price


def _force_min_price(product_id: int, amount: float) -> None:
    """Fixe tous les prix dispo du produit a `amount` (pour un test deterministe)."""
    db = SessionLocal()
    try:
        rows = db.query(Price).filter(Price.product_id == product_id).all()
        for row in rows:
            row.amount = amount
            row.is_available = True
        db.commit()
    finally:
        db.close()


def test_create_alert(client, auth_headers, demo_catalog):
    """Creer une alerte de prix au-dessous du prix observe."""
    _force_min_price(demo_catalog["product_id"], 38000.0)
    response = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["product_name"] == "SSD 512 Go Test"
    assert body["current_price"] == 38000.0
    assert body["target_price"] == 30000.0
    assert body["is_active"] is True
    assert body["triggered"] is False


def test_create_alert_prix_deja_atteint(client, auth_headers, demo_catalog):
    """Une alerte dont la cible est deja au-dessus du prix observe est declenchee."""
    _force_min_price(demo_catalog["product_id"], 38000.0)
    response = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 40000.0},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["triggered"] is True
    assert body["triggered_at"] is not None


def test_upsert_alerte_unique(client, auth_headers, demo_catalog):
    """Deux creations pour le meme produit mettent a jour la meme alerte."""
    payload = {"product_id": demo_catalog["product_id"], "target_price": 30000.0}
    first = client.post("/api/v1/alerts", headers=auth_headers, json=payload)
    second = client.post("/api/v1/alerts", headers=auth_headers, json=payload)
    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    listed = client.get("/api/v1/alerts", headers=auth_headers).json()
    assert len(listed) == 1


def test_alerte_reevaluee_en_lecture(client, auth_headers, demo_catalog):
    """Si le prix baisse sous la cible, l'alerte est marquee declenchee."""
    _force_min_price(demo_catalog["product_id"], 38000.0)
    client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    )
    _force_min_price(demo_catalog["product_id"], 25000.0)

    listed = client.get("/api/v1/alerts", headers=auth_headers).json()
    assert listed[0]["current_price"] == 25000.0
    assert listed[0]["triggered"] is True


def test_filter_alertes_declenchees(client, auth_headers, demo_catalog):
    """Le filtre /alerts?triggered_only=true ne garde que les alertes declenchees."""
    _force_min_price(demo_catalog["product_id"], 38000.0)
    client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    )
    _force_min_price(demo_catalog["product_id"], 25000.0)
    listed = client.get(
        "/api/v1/alerts", headers=auth_headers, params={"triggered_only": True}
    ).json()
    assert len(listed) == 1
    assert listed[0]["triggered"] is True


def test_alerte_produit_absent(client, auth_headers):
    """Une alerte sur un produit inexistant renvoie 404."""
    response = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": 999999, "target_price": 1000.0},
    )
    assert response.status_code == 404


def test_alerte_cible_non_valide(client, auth_headers, demo_catalog):
    """Un prix cible negatif ou nul est rejete."""
    response = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 0},
    )
    assert response.status_code == 422


def test_update_alert(client, auth_headers, demo_catalog):
    """Modifier la cible et desactiver une alerte."""
    _force_min_price(demo_catalog["product_id"], 38000.0)
    created = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    ).json()
    url = f"/api/v1/alerts/{created['id']}"

    updated = client.patch(url, headers=auth_headers, json={"target_price": 45000.0})
    assert updated.status_code == 200, updated.text
    assert updated.json()["target_price"] == 45000.0
    assert updated.json()["triggered"] is True

    inactive = client.patch(url, headers=auth_headers, json={"is_active": False})
    assert inactive.status_code == 200
    assert inactive.json()["is_active"] is False


def test_delete_alert(client, auth_headers, demo_catalog):
    """Supprimer une alerte est possible; re-supprimer renvoie 404."""
    created = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    ).json()
    url = f"/api/v1/alerts/{created['id']}"

    assert client.delete(url, headers=auth_headers).status_code == 204
    assert client.delete(url, headers=auth_headers).status_code == 404
    assert client.get("/api/v1/alerts", headers=auth_headers).json() == []


def test_alerte_isolee_par_utilisateur(client, auth_headers, demo_catalog):
    """Un autre utilisateur ne peut ni modifier ni lire les alertes d'autrui."""
    created = client.post(
        "/api/v1/alerts",
        headers=auth_headers,
        json={"product_id": demo_catalog["product_id"], "target_price": 30000.0},
    ).json()

    other = client.post(
        "/api/v1/auth/register",
        json={
            "email": "autreclient@test.com",
            "password": "motdepasse123",
            "full_name": "Autre Client",
            "role": "CLIENT",
        },
    )
    assert other.status_code == 201
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "autreclient@test.com", "password": "motdepasse123"},
    )
    other_headers = {
        "Authorization": f"Bearer {login.json()['access_token']}"
    }

    assert (
        client.patch(
            f"/api/v1/alerts/{created['id']}", headers=other_headers, json={"is_active": False}
        ).status_code
        == 404
    )
    assert client.delete(f"/api/v1/alerts/{created['id']}", headers=other_headers).status_code == 404
    assert client.get("/api/v1/alerts", headers=other_headers).json() == []


def test_alertes_requierent_auth(client):
    """Les alertes exigent un utilisateur connecte."""
    assert client.get("/api/v1/alerts").status_code == 401
    assert (
        client.post("/api/v1/alerts", json={"product_id": 1, "target_price": 1000.0}).status_code
        == 401
    )