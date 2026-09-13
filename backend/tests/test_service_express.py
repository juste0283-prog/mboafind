"""Tests du Service Express : priorite et echeance des demandes."""

from datetime import datetime, timedelta, timezone

FUTURE = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
PAST = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()


def test_create_request_default_normal(client, auth_headers, demo_professional):
    """Une demande sans priorite est creee en NORMAL sans echeance."""
    response = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={"service_id": demo_professional["service_id"]},
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["priority"] == "NORMAL"
    assert body["requested_deadline"] is None


def test_create_express_request(client, auth_headers, demo_professional):
    """Une demande EXPRESS conserve sa priorite et son echeance."""
    response = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "message": "Urgent, demain si possible.",
            "priority": "EXPRESS",
            "requested_deadline": FUTURE,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["priority"] == "EXPRESS"
    assert body["requested_deadline"] is not None


def test_create_request_past_deadline_rejected(client, auth_headers, demo_professional):
    """Une echeance deja passee est refusee (400)."""
    response = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "priority": "EXPRESS",
            "requested_deadline": PAST,
        },
    )
    assert response.status_code == 400, response.text


def test_express_notification_to_pro(client, auth_headers, pro_headers, demo_professional):
    """Le professionnel recoit un message d'alerte pour une demande urgente."""
    client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "priority": "EXPRESS",
        },
    )
    response = client.get("/api/v1/notifications", headers=pro_headers)
    assert response.status_code == 200
    items = response.json()["items"]
    assert any(n["title"] == "Nouvelle demande urgente" for n in items)


def test_professional_inbox_lists_express_first(
    client, auth_headers, pro_headers, demo_professional
):
    """Les demandes EXPRESS sont listees en premier dans l'inbox du pro."""
    client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={"service_id": demo_professional["service_id"]},
    )
    client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "priority": "EXPRESS",
        },
    )
    response = client.get("/api/v1/service-requests/inbox", headers=pro_headers)
    assert response.status_code == 200
    items = response.json()["items"]
    assert items[0]["priority"] == "EXPRESS"
    express_index = next(i for i, r in enumerate(items) if r["priority"] == "EXPRESS")
    normal_index = next(
        (i for i, r in enumerate(items) if r["priority"] == "NORMAL"), None
    )
    assert normal_index is not None
    assert express_index < normal_index


def test_express_request_visible_by_client(client, auth_headers, demo_professional):
    """Le client retrouve la priorite dans son historique."""
    created = client.post(
        "/api/v1/service-requests",
        headers=auth_headers,
        json={
            "service_id": demo_professional["service_id"],
            "priority": "EXPRESS",
            "requested_deadline": FUTURE,
        },
    ).json()
    response = client.get("/api/v1/service-requests", headers=auth_headers)
    body = response.json()
    mine = next((r for r in body["items"] if r["id"] == created["id"]), None)
    assert mine is not None
    assert mine["priority"] == "EXPRESS"
    assert mine["requested_deadline"] is not None