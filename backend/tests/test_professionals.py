"""Tests des services express cote client : professionnels et demandes."""


def test_search_professionals(client, demo_professional):
    """La recherche de professionnels par mot-cle retourne le testeur."""
    response = client.get("/api/v1/professionals", params={"search": "écran"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert any(
        p["id"] == demo_professional["professional_id"] for p in body["items"]
    )


def test_professional_detail(client, demo_professional):
    """La fiche professionnel expose services et avis."""
    response = client.get(
        f"/api/v1/professionals/{demo_professional['professional_id']}"
    )
    assert response.status_code == 200
    body = response.json()
    assert body["profession"] == "Réparateur de téléphones"
    assert len(body["services"]) >= 1
    assert body["services"][0]["price"] == 15000


def test_professional_detail_absent(client):
    """Une fiche professionnel inconnue renvoie 404."""
    response = client.get("/api/v1/professionals/999999")
    assert response.status_code == 404


def test_create_service_request(client, auth_headers, demo_professional):
    """Un client cree une demande (statut initial ''creee'')."""
    response = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "message": "Bonjour, disponible cette semaine ?",
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["status"] == "PENDING"
    assert body["service_id"] == demo_professional["service_id"]


def test_service_request_sans_auth(client, demo_professional):
    """Creer une demande sans client connecte renvoie 401."""
    response = client.post(
        "/api/v1/service-requests",
        json={"service_id": demo_professional["service_id"]},
    )
    assert response.status_code == 401


def test_list_my_requests(client, auth_headers, demo_professional):
    """L'historique des demandes du client est consultable."""
    client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={"service_id": demo_professional["service_id"]},
    )
    response = client.get("/api/v1/service-requests", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["service_name"] == "Changement d'écran"


def test_cancel_request(client, auth_headers, demo_professional):
    """Un client annule une demande en statut ''creee''."""
    created = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={"service_id": demo_professional["service_id"]},
    ).json()
    response = client.patch(
        f"/api/v1/service-requests/{created['id']}/cancel",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["status"] == "CANCELLED"