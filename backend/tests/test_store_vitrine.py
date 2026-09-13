"""Tests de la vitrine vendeur : banniere, logo et lien de gestion."""


def test_store_vitrine_creation(client, commerce_headers):
    """La creation d'une boutique accepte banniere et logo."""
    created = client.post(
        "/api/v1/stores",
        headers=commerce_headers,
        json={
            "name": "Vitrine Test",
            "city": "Yaoundé",
            "banner_url": "https://exemple.com/banniere.jpg",
            "logo_url": "https://exemple.com/logo.jpg",
        },
    )
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["banner_url"] == "https://exemple.com/banniere.jpg"
    assert data["logo_url"] == "https://exemple.com/logo.jpg"
    assert data["owner_id"] is not None
    store_id = data["id"]

    updated = client.patch(
        f"/api/v1/stores/{store_id}",
        headers=commerce_headers,
        json={"banner_url": "https://exemple.com/nouvelle-banniere.jpg"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["banner_url"] == "https://exemple.com/nouvelle-banniere.jpg"
    assert updated.json()["logo_url"] == "https://exemple.com/logo.jpg"


def test_store_vitrine_publique(client, commerce_headers, demo_catalog):
    """Les champs vitrine sont exposes sur la fiche publique."""
    store_id = demo_catalog["store_id"]
    detail = client.get(f"/api/v1/stores/{store_id}")
    assert detail.status_code == 200, detail.text
    assert "banner_url" in detail.json()
    assert "logo_url" in detail.json()

    directory = client.get("/api/v1/stores/public")
    assert directory.status_code == 200
    assert all("banner_url" in s and "logo_url" in s for s in directory.json())