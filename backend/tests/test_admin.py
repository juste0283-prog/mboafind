"""Tests de la moderation admin (signalements et avis)."""


def test_admin_requiert_role_admin(client, auth_headers, demo_catalog):
    """La file de moderation est reservee aux administrateurs."""
    assert client.get("/api/v1/admin/reports").status_code == 401
    assert client.get("/api/v1/admin/reports", headers=auth_headers).status_code == 403
    assert client.get("/api/v1/admin/reviews", headers=auth_headers).status_code == 403


def test_report_moderation(client, auth_headers, admin_headers, demo_catalog):
    """Un signalement PENDING peut etre resolu ou classe sans suite par l'admin."""
    price_id = demo_catalog["price_ids"][0]
    report = client.post(
        "/api/v1/reports",
        headers=auth_headers,
        json={"target_type": "PRICE", "target_id": price_id, "reason": "Prix faux sur place"},
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]

    queue = client.get("/api/v1/admin/reports", headers=admin_headers)
    assert queue.status_code == 200
    assert queue.json()["total"] >= 1
    assert any(r["id"] == report_id for r in queue.json()["items"])

    resolved = client.patch(
        f"/api/v1/admin/reports/{report_id}",
        headers=admin_headers,
        json={"status": "DISMISSED"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "DISMISSED"
    assert resolved.json()["reporter_name"] is not None

    pending = client.get(
        "/api/v1/admin/reports", headers=admin_headers, params={"status": "PENDING"}
    ).json()
    assert all(r["id"] != report_id for r in pending["items"])

    unknown = client.patch(
        "/api/v1/admin/reports/999999", headers=admin_headers, json={"status": "DISMISSED"}
    )
    assert unknown.status_code == 404


def test_review_moderation(client, auth_headers, admin_headers, demo_catalog):
    """L'admin peut rejeter un avis qui disparait alors de la lecture publique."""
    review = client.post(
        "/api/v1/reviews",
        headers=auth_headers,
        json={
            "store_id": demo_catalog["store2_id"],
            "rating": 1,
            "comment": "Service deplorable a verifier.",
        },
    )
    assert review.status_code == 201, review.text
    review_id = review.json()["id"]

    rejected = client.patch(
        f"/api/v1/admin/reviews/{review_id}",
        headers=admin_headers,
        json={"moderation_status": "REJECTED"},
    )
    assert rejected.status_code == 200
    assert rejected.json()["moderation_status"] == "REJECTED"

    public = client.get(
        "/api/v1/reviews", params={"store_id": demo_catalog["store2_id"]}
    ).json()
    assert all(r["id"] != review_id for r in public["items"])

    unknown = client.patch(
        "/api/v1/admin/reviews/999999",
        headers=admin_headers,
        json={"moderation_status": "APPROVED"},
    )
    assert unknown.status_code == 404