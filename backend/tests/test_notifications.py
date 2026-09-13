"""Tests des notifications in-app : declencheurs metier, lecture, marquage.

Chaque test utilise ses propres utilisateurs (prefixe uuid) afin de rester
independant des autres tests du module et de la session de test partagee.
"""

import uuid

from app.models.enums import UserRole


def _register(client, prefix: str, role: UserRole) -> dict:
    """Cree un utilisateur et retourne ses en-tetes JWT."""
    email = f"{prefix}-{uuid.uuid4().hex[:6]}@test.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "motdepasse123",
            "full_name": f"Utilisateur {prefix}",
            "role": role.value,
        },
    )
    assert response.status_code == 201, response.text
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "motdepasse123"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _create_store_product_prix(client, headers, amount=30000):
    """Boutique + produit + prix pour un commercant. Retourne leurs ids."""
    store_id = client.post(
        "/api/v1/stores", json={"name": f"Boutique {uuid.uuid4().hex[:6]}"},
        headers=headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": f"Produit {uuid.uuid4().hex[:6]}"},
        headers=headers,
    ).json()["id"]
    client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": amount, "is_available": True},
        headers=headers,
    )
    return store_id, product_id


def _login(client, email: str) -> dict:
    """Login d'un utilisateur deja cree (fixtures de session partagees)."""
    token = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "motdepasse123"},
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _unread(client, headers) -> int:
    return client.get(
        "/api/v1/notifications/unread-count", headers=headers
    ).json()["count"]


def _list(client, headers) -> list[dict]:
    return client.get("/api/v1/notifications", headers=headers).json()["items"]


def test_aucune_notification_au_debut(client):
    headers = _register(client, "neo", UserRole.CLIENT)
    assert _unread(client, headers) == 0
    assert _list(client, headers) == []


def test_alerte_prix_atteinte_notifie_le_client(client):
    """Un prix baisse sous la cible : le client recoit une notification."""
    commerce = _register(client, "marchand", UserRole.COMMERCANT)
    client_c = _register(client, "acheteur", UserRole.CLIENT)
    store_id, product_id = _create_store_product_prix(client, commerce, amount=30000)

    # Alerte ciblee a 25000, pas encore declenchee (prix observe : 30000).
    response = client.post(
        "/api/v1/alerts",
        json={"product_id": product_id, "target_price": 25000},
        headers=client_c,
    )
    assert response.status_code == 201, response.text
    assert response.json()["triggered"] is False
    assert _unread(client, client_c) == 0

    # Le commercant publie un prix a 15000 : l'alerte se declenche.
    client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 15000, "is_available": True},
        headers=commerce,
    )

    assert _unread(client, client_c) == 1
    item = _list(client, client_c)[0]
    assert item["type"] == "price_alert_triggered"
    assert item["is_read"] is False
    assert item["data"]["product_id"] == product_id
    assert "15,000 FCFA" in item["message"]


def test_demande_de_service_notifie_le_professionnel(
    client, demo_professional
):
    """Une demande creee : le professionnel recoit une notification."""
    cli = _register(client, "client", UserRole.CLIENT)
    pro = _login(client, "pro@test.com")
    before = _unread(client, pro)

    response = client.post(
        "/api/v1/service-requests",
        json={
            "service_id": demo_professional["service_id"],
            "message": "Bonjour, j'ai besoin d'aide.",
        },
        headers=cli,
    )
    assert response.status_code == 201, response.text

    assert _unread(client, pro) == before + 1


def test_changement_statut_notifie_le_client(client, demo_professional):
    """Accepter / decliner une demande : le client est informe."""
    cli = _register(client, "client2", UserRole.CLIENT)
    pro = _login(client, "pro@test.com")

    request_id = client.post(
        "/api/v1/service-requests",
        json={"service_id": demo_professional["service_id"]},
        headers=cli,
    ).json()["id"]

    client.patch(f"/api/v1/service-requests/{request_id}/accept", headers=pro)
    assert _unread(client, cli) == 1
    item = _list(client, cli)[0]
    assert item["type"] == "request_accepted"

    # Marquage lu puis nouvel evenement.
    client.post(f"/api/v1/notifications/{item['id']}/read", headers=cli)
    assert _unread(client, cli) == 0

    client.patch(f"/api/v1/service-requests/{request_id}/start", headers=pro)
    client.patch(f"/api/v1/service-requests/{request_id}/complete", headers=pro)
    types = {n["type"] for n in _list(client, cli)}
    assert {"request_in_progress", "request_completed"} <= types
    assert _unread(client, cli) == 2


def test_marquer_toutes_lues_et_supprimer(client, demo_professional):
    cli = _register(client, "client3", UserRole.CLIENT)
    pro = _login(client, "pro@test.com")

    for _ in range(3):
        rid = client.post(
            "/api/v1/service-requests",
            json={"service_id": demo_professional["service_id"]},
            headers=cli,
        ).json()["id"]
        client.patch(f"/api/v1/service-requests/{rid}/accept", headers=pro)

    assert _unread(client, cli) == 3
    assert (
        client.post("/api/v1/notifications/read-all", headers=cli).json()["count"] == 3
    )
    assert _unread(client, cli) == 0

    nid = _list(client, cli)[0]["id"]
    assert client.delete(f"/api/v1/notifications/{nid}", headers=cli).status_code == 204
    assert all(n["id"] != nid for n in _list(client, cli))


def test_confirmation_prix_notifie_le_commercants(client):
    """Un client confirme un prix : la boutique (proprietaire) est notifiee."""
    commerce = _register(client, "marchand2", UserRole.COMMERCANT)
    cli = _register(client, "acheteur2", UserRole.CLIENT)
    store_id, product_id = _create_store_product_prix(client, commerce, amount=40000)

    price_id = client.get(
        f"/api/v1/stores/{store_id}/prices", headers=commerce
    ).json()[0]["id"]
    assert _unread(client, commerce) == 0

    response = client.post(
        f"/api/v1/prices/{price_id}/confirm", headers=cli
    )
    assert response.status_code == 200, response.text

    assert _unread(client, commerce) == 1
    item = _list(client, commerce)[0]
    assert item["type"] == "price_confirmed"
    assert item["data"]["price_id"] == price_id
    # Le commercial ne recoit pas sa propre confirmation.
    assert _unread(client, cli) == 0


def test_moderation_signalement_notifie_le_signalant(client, admin_headers):
    """Un signalement resolu : son auteur recoit une notification."""
    reporter = _register(client, "temoins", UserRole.CLIENT)

    report = client.post(
        "/api/v1/reports",
        json={"target_type": "PRODUCT", "target_id": 1, "reason": "prix incorrect"},
        headers=reporter,
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]

    response = client.patch(
        f"/api/v1/admin/reports/{report_id}",
        json={"status": "RESOLVED"},
        headers=admin_headers,
    )
    assert response.status_code == 200, response.text

    assert _unread(client, reporter) == 1
    assert _list(client, reporter)[0]["type"] == "report_resolved"


def test_notifications_inaccessibles_sans_token(client):
    assert client.get("/api/v1/notifications").status_code == 401
    assert client.get("/api/v1/notifications/unread-count").status_code == 401
    assert client.post("/api/v1/notifications/read-all").status_code == 401
    assert client.delete("/api/v1/notifications/1").status_code == 401