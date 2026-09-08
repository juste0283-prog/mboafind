"""Tests du flux d'authentification (register / login / me)."""

import pytest


def test_register(client):
    """L'inscription cree un utilisateur et ne renvoie jamais le hash."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "nouveau@test.com", "password": "motdepasse123"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "nouveau@test.com"
    assert body["role"] == "CLIENT"
    assert "password" not in body and "password_hash" not in body


def test_register_duplicate_email(client, auth_headers):
    """L'inscription avec un email deja pris renvoie une 409."""
    payload = {"email": "client@test.com", "password": "motdepasse123"}
    assert client.post("/api/v1/auth/register", json=payload).status_code == 409


def test_register_mot_de_passe_trop_court(client):
    """Le mot de passe doit faire au moins 8 caracteres."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "court@test.com", "password": "court"},
    )
    assert response.status_code == 422


def test_login_ok(client, auth_headers):
    """La connexion retourne un token JWT."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "client@test.com", "password": "motdepasse123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


@pytest.mark.parametrize(
    "email,password",
    [
        ("client@test.com", "mauvais-mot-de-passe"),
        ("inconnu@test.com", "motdepasse123"),
    ],
)
def test_login_echec(client, email, password):
    """Un couple identifiant/mot de passe invalide renvoie une 401."""
    response = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert response.status_code == 401


def test_me_sans_token(client):
    """Sans token, /auth/me renvoie une 401."""
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_avec_token(client, auth_headers):
    """Avec un token valide, /auth/me retourne le profil."""
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "client@test.com"


def test_users_me(client, auth_headers):
    """La route /users/me est accessible avec authentification."""
    response = client.get("/api/v1/users/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "client@test.com"


def test_update_profil(client, auth_headers):
    """L'utilisateur peut mettre a jour son nom et son telephone."""
    response = client.patch(
        "/api/v1/users/me",
        headers=auth_headers,
        json={"full_name": "Nouveau Nom", "phone": "+237 6 00 00 00 00"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["full_name"] == "Nouveau Nom"
    assert body["phone"] == "+237 6 00 00 00 00"