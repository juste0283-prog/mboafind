"""Tests du workflow professionnel : profil, services et demandes."""

import uuid

import pytest


@pytest.fixture(scope="module")
def pro_headers_unique(client):
    """Un professionnel dedie aux tests de ce module (isole des autres)."""
    email = f"pro_unique_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "motdepasse123", "role": "PROFESSIONNEL"},
    )
    resp = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "motdepasse123"}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture(scope="module")
def client_headers(client):
    """Un client dedie a ce module."""
    email = f"client_unique_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "motdepasse123", "role": "CLIENT"},
    )
    resp = client.post(
        "/api/v1/auth/login", json={"email": email, "password": "motdepasse123"}
    )
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_creer_profil_professionnel(client, pro_headers_unique):
    response = client.put(
        "/api/v1/me/professional",
        json={
            "profession": "Electricien",
            "bio": "Installations et depannages.",
            "city": "Yaounde",
        },
        headers=pro_headers_unique,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["profession"] == "Electricien"
    assert "id" in data


def test_recuperer_mon_profil(client, pro_headers_unique):
    client.put(
        "/api/v1/me/professional",
        json={"profession": "Plombier", "city": "Douala"},
        headers=pro_headers_unique,
    )
    response = client.get("/api/v1/me/professional", headers=pro_headers_unique)
    assert response.status_code == 200
    assert response.json()["profession"] == "Plombier"


def test_ajouter_service(client, pro_headers_unique):
    client.put(
        "/api/v1/me/professional",
        json={"profession": "Informaticien"},
        headers=pro_headers_unique,
    )
    response = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Depannage PC", "price": 10000, "description": "A domicile."},
        headers=pro_headers_unique,
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["name"] == "Depannage PC"
    assert data["price"] == 10000


def test_modifier_service(client, pro_headers_unique):
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Reinstallation", "price": 5000},
        headers=pro_headers_unique,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/me/professional/services/{service_id}",
        json={"price": 7000},
        headers=pro_headers_unique,
    )
    assert response.status_code == 200
    assert response.json()["price"] == 7000


def test_supprimer_service(client, pro_headers_unique):
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "A supprimer", "price": 1000},
        headers=pro_headers_unique,
    ).json()["id"]
    response = client.delete(
        f"/api/v1/me/professional/services/{service_id}", headers=pro_headers_unique
    )
    assert response.status_code == 204


def test_profil_professionnel_role_exige(client, client_headers):
    """Seul un PROFESSIONNEL peut creer son profil."""
    response = client.put(
        "/api/v1/me/professional",
        json={"profession": "Mecano"},
        headers=client_headers,
    )
    assert response.status_code == 403


def test_workflow_complet_demande(
    client, client_headers, pro_headers_unique
):
    """Client cree une demande -> professionnel accepte -> en cours -> terminee."""
    # Le professionnel cree un profil et un service
    client.put(
        "/api/v1/me/professional",
        json={"profession": "Reparateur"},
        headers=pro_headers_unique,
    )
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Depannage", "price": 8000},
        headers=pro_headers_unique,
    ).json()["id"]

    # 1. Le client cree la demande
    request_create = client.post(
        "/api/v1/service-requests",
        json={"service_id": service_id, "message": "Mon ecran est casse."},
        headers=client_headers,
    )
    assert request_create.status_code == 201, request_create.text
    request_id = request_create.json()["id"]
    assert request_create.json()["status"] == "PENDING"

    # 2. Le professionnel voit la demande dans son inbox
    inbox = client.get("/api/v1/service-requests/inbox", headers=pro_headers_unique)
    assert inbox.status_code == 200
    assert any(r["id"] == request_id for r in inbox.json()["items"])

    # 3. Le professionnel accepte
    accepted = client.patch(
        f"/api/v1/service-requests/{request_id}/accept", headers=pro_headers_unique
    )
    assert accepted.status_code == 200
    assert accepted.json()["status"] == "ACCEPTED"

    # 4. Le client peut verifier le statut
    mine = client.get("/api/v1/service-requests", headers=client_headers)
    assert any(
        r["id"] == request_id and r["status"] == "ACCEPTED" for r in mine.json()["items"]
    )

    # 5. Le professionnel demarre puis termine
    started = client.patch(
        f"/api/v1/service-requests/{request_id}/start", headers=pro_headers_unique
    )
    assert started.json()["status"] == "IN_PROGRESS"
    completed = client.patch(
        f"/api/v1/service-requests/{request_id}/complete", headers=pro_headers_unique
    )
    assert completed.json()["status"] == "COMPLETED"


def test_refus_demande(client, client_headers, pro_headers_unique):
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Service pour refus", "price": 3000},
        headers=pro_headers_unique,
    ).json()["id"]
    request_id = client.post(
        "/api/v1/service-requests",
        json={"service_id": service_id},
        headers=client_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/service-requests/{request_id}/decline", headers=pro_headers_unique
    )
    assert response.status_code == 200
    assert response.json()["status"] == "DECLINED"


def test_client_ne_peut_pas_accepter(client, client_headers, pro_headers_unique):
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Service accept", "price": 3000},
        headers=pro_headers_unique,
    ).json()["id"]
    request_id = client.post(
        "/api/v1/service-requests",
        json={"service_id": service_id},
        headers=client_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/service-requests/{request_id}/accept", headers=client_headers
    )
    assert response.status_code == 403


def test_professionnel_non_concerne(
    client, client_headers, pro_headers_unique
):
    """Un autre professionnel ne peut pas traiter la demande d'un collegue."""
    email = f"pro2_{uuid.uuid4().hex[:8]}@test.com"
    client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "motdepasse123", "role": "PROFESSIONNEL"},
    )
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": "motdepasse123"})
    pro2_headers = {"Authorization": f"Bearer {resp.json()['access_token']}"}
    client.put(
        "/api/v1/me/professional",
        json={"profession": "Autre professionnel"},
        headers=pro2_headers,
    )

    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Service isole", "price": 3000},
        headers=pro_headers_unique,
    ).json()["id"]
    request_id = client.post(
        "/api/v1/service-requests",
        json={"service_id": service_id},
        headers=client_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/service-requests/{request_id}/accept", headers=pro2_headers
    )
    assert response.status_code == 403


def test_statuts_impossibles(client, client_headers, pro_headers_unique):
    """On ne peut pas completer une demande sans l'avoir acceptee."""
    service_id = client.post(
        "/api/v1/me/professional/services",
        json={"name": "Service statut", "price": 3000},
        headers=pro_headers_unique,
    ).json()["id"]
    request_id = client.post(
        "/api/v1/service-requests",
        json={"service_id": service_id},
        headers=client_headers,
    ).json()["id"]
    response = client.patch(
        f"/api/v1/service-requests/{request_id}/start", headers=pro_headers_unique
    )
    assert response.status_code == 400