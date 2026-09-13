"""Tests de la console d'administration (statistiques, boutiques,
professionnels et comptes utilisateurs)."""


def _login(client, email: str) -> dict:
    return client.post(
        "/api/v1/auth/login", json={"email": email, "password": "motdepasse123"}
    ).json()


def _notifications(client, token: str) -> list[dict]:
    return client.get(
        "/api/v1/notifications", headers={"Authorization": f"Bearer {token}"}
    ).json()["items"]


def test_overview_admin(client, auth_headers, admin_headers, demo_catalog):
    """La synthese est reservee a l'admin et reflete le catalogue."""
    assert client.get("/api/v1/admin/overview").status_code == 401
    assert client.get("/api/v1/admin/overview", headers=auth_headers).status_code == 403

    overview = client.get("/api/v1/admin/overview", headers=admin_headers)
    assert overview.status_code == 200, overview.text
    data = overview.json()
    assert data["users_total"] >= 3
    assert data["stores_total"] >= 2
    assert data["stores_verified"] >= 1
    assert data["products_total"] >= 1
    assert data["prices_total"] >= 2
    assert "reports_pending" in data
    assert "reviews_pending" in data


def test_admin_stores_list(client, admin_headers, demo_catalog):
    """L'admin liste toutes les boutiques, verifiees ou non."""
    stores = client.get("/api/v1/admin/stores", headers=admin_headers)
    assert stores.status_code == 200, stores.text
    data = stores.json()
    assert data["total"] >= 2
    ids = {s["id"] for s in data["items"]}
    assert demo_catalog["store2_id"] in ids
    store2 = next(s for s in data["items"] if s["id"] == demo_catalog["store2_id"])
    assert store2["is_verified"] is False
    assert store2["owner_email"] is not None


def test_admin_verify_store(client, admin_headers, commerce_headers, demo_catalog):
    """La verification d'une boutique notifie son proprietaire."""
    store_id = demo_catalog["store2_id"]
    payload = {"is_verified": True}
    verified = client.patch(
        f"/api/v1/admin/stores/{store_id}/verify", headers=admin_headers, json=payload
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["is_verified"] is True

    merchant_token = _login(client, "commercant@test.com")["access_token"]
    assert any(
        n["type"] == "store_verified" for n in _notifications(client, merchant_token)
    )

    unverified = client.patch(
        f"/api/v1/admin/stores/{store_id}/verify",
        headers=admin_headers,
        json={"is_verified": False},
    )
    assert unverified.status_code == 200
    assert unverified.json()["is_verified"] is False

    missing = client.patch(
        "/api/v1/admin/stores/999999/verify", headers=admin_headers, json=payload
    )
    assert missing.status_code == 404


def test_admin_professionals_verify(
    client, admin_headers, pro_headers, demo_professional
):
    """L'admin liste et verifie les professionnels."""
    pro_id = demo_professional["professional_id"]

    pros = client.get("/api/v1/admin/professionals", headers=admin_headers)
    assert pros.status_code == 200, pros.text
    assert any(p["id"] == pro_id for p in pros.json()["items"])

    verified = client.patch(
        f"/api/v1/admin/professionals/{pro_id}/verify",
        headers=admin_headers,
        json={"is_verified": True},
    )
    assert verified.status_code == 200, verified.text
    assert verified.json()["is_verified"] is True

    pro_token = _login(client, "pro@test.com")["access_token"]
    assert any(
        n["type"] == "professional_verified"
        for n in _notifications(client, pro_token)
    )

    missing = client.patch(
        "/api/v1/admin/professionals/999999/verify",
        headers=admin_headers,
        json={"is_verified": True},
    )
    assert missing.status_code == 404


def test_admin_users_list_and_status(client, admin_headers, demo_catalog):
    """L'admin suspend puis reactive un compte, avec notification."""
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "suspension@test.com",
            "password": "motdepasse123",
            "full_name": "A Suspendre",
            "role": "CLIENT",
        },
    )
    assert register.status_code == 201, register.text
    target_id = register.json()["id"]

    users = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users.status_code == 200, users.text
    assert any(u["id"] == target_id and u["is_active"] is True for u in users.json()["items"])

    suspended = client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert suspended.status_code == 200, suspended.text
    assert suspended.json()["is_active"] is False

    token = _login(client, "suspension@test.com")
    assert token.get("access_token")
    auth_headers_suspended = {"Authorization": f"Bearer {token['access_token']}"}
    assert client.get("/api/v1/auth/me", headers=auth_headers_suspended).status_code == 403
    assert client.get("/api/v1/notifications", headers=auth_headers_suspended).status_code == 403

    admin_me = client.get("/api/v1/auth/me", headers=admin_headers).json()
    self_block = client.patch(
        f"/api/v1/admin/users/{admin_me['id']}/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert self_block.status_code == 400

    reactivated = client.patch(
        f"/api/v1/admin/users/{target_id}/status",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert reactivated.status_code == 200
    assert reactivated.json()["is_active"] is True

    fresh_token = _login(client, "suspension@test.com")["access_token"]
    notices = _notifications(client, fresh_token)
    assert any(n["type"] == "account_status" and "suspendu" in n["message"].lower() for n in notices)
    assert any(n["type"] == "account_status" and "réactivé" in n["message"].lower() for n in notices)

    missing = client.patch(
        "/api/v1/admin/users/999999/status",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert missing.status_code == 404