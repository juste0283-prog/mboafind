"""Tests des avis cote client (eligibilite, moderation MVP)."""


def test_review_store(client, auth_headers, demo_catalog):
    """Un client connecte note une boutique (une seule fois par cible)."""
    response = client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={
            "store_id": demo_catalog["store_id"],
            "rating": 4,
            "comment": "Bon rapport qualite/prix.",
        },
    )
    assert response.status_code == 201, response.text
    assert response.json()["rating"] == 4
    assert response.json()["moderation_status"] == "APPROVED"

    # Second avis sur la meme boutique -> 409.
    duplicate = client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={"store_id": demo_catalog["store_id"], "rating": 5},
    )
    assert duplicate.status_code == 409


def test_review_requires_target(client, auth_headers):
    """Un avis sans cible (ni boutique ni pro) est invalide."""
    response = client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={"rating": 5, "comment": "sans cible"},
    )
    assert response.status_code == 422


def test_review_rating_hors_bornes(client, auth_headers, demo_catalog):
    """La note doit rester entre 1 et 5."""
    response = client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={"store_id": demo_catalog["store2_id"], "rating": 6},
    )
    assert response.status_code == 422


def test_review_pro_without_service(client, auth_headers, demo_professional):
    """Noter un professionnel sans interaction terminee est refuse (403).

    Utilise un compte client different pour ne pas dependre de l'etat.
    """
    from fastapi.testclient import TestClient
    from app.models.enums import UserRole
    from tests.conftest import _register_and_login

    # Reutilise le client existant mais cree un second utilisateur.
    second = client.post(
        "/api/v1/auth/register",
        json={
            "email": "client2@test.com",
            "password": "motdepasse123",
            "role": UserRole.CLIENT.value,
        },
    )
    assert second.status_code == 201, second.text
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "client2@test.com", "password": "motdepasse123"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    response = client.post(
        "/api/v1/reviews",
        headers=headers,
        json={
            "professional_id": demo_professional["professional_id"],
            "rating": 5,
        },
    )
    assert response.status_code == 403


def test_list_reviews(client, demo_catalog):
    """Les avis publics d'une boutique sont consultables sans authentification."""
    response = client.get(
        "/api/v1/reviews", params={"store_id": demo_catalog["store_id"]}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert body["items"][0]["author_name"] is not None


def test_my_reviews(client, auth_headers):
    """L'utilisateur consulte ses propres avis."""
    response = client.get("/api/v1/reviews/mine", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["total"] >= 1