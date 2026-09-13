"""Tests des images de produits : upload, galerie, image principale."""

import uuid

import base64

# Un petit PNG 1x1 valide.
TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
)


def _create_product(client, commerce_headers, name):
    """Cree une boutique + un produit + un prix, retourne le product_id.

    Chaque test utilise son propre produit afin de rester independant des
    autres tests (la base de test est partagee entre les tests du module).
    """
    store_id = client.post(
        "/api/v1/stores", json={"name": f"Boutique {uuid.uuid4().hex[:6]}"},
        headers=commerce_headers,
    ).json()["id"]
    product_id = client.post(
        f"/api/v1/stores/{store_id}/products",
        json={"name": name},
        headers=commerce_headers,
    ).json()["id"]
    client.post(
        f"/api/v1/stores/{store_id}/prices",
        params={"product_id": product_id},
        json={"amount": 10000, "is_available": True},
        headers=commerce_headers,
    )
    return product_id


def _upload_image(client, product_id, headers, *, filename="photo.png", content=None):
    return client.post(
        f"/api/v1/stores/products/{product_id}/images",
        files={"file": (filename, content or TINY_PNG, "image/png")},
        headers=headers,
    )


def test_upload_premiere_image_devient_principale(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 1")
    response = _upload_image(client, product_id, commerce_headers)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["is_primary"] is True
    assert data["product_id"] == product_id
    assert data["url"].startswith("/uploads/")

    detail = client.get(f"/api/v1/products/{product_id}")
    assert detail.status_code == 200
    assert detail.json()["image_url"] == data["url"]
    assert len(detail.json()["images"]) == 1
    assert detail.json()["images"][0]["id"] == data["id"]


def test_upload_deux_images_galerie(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 2")
    first = _upload_image(client, product_id, commerce_headers).json()
    second = _upload_image(client, product_id, commerce_headers).json()

    assert second["is_primary"] is False
    assert second["position"] > first["position"]

    # La fiche expose les deux images dans la galerie.
    detail = client.get(f"/api/v1/products/{product_id}").json()
    assert len(detail["images"]) == 2


def test_definir_image_principale(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 3")
    first = _upload_image(client, product_id, commerce_headers).json()
    second = _upload_image(client, product_id, commerce_headers).json()

    response = client.post(
        f"/api/v1/stores/products/{product_id}/images/{second['id']}/primary",
        headers=commerce_headers,
    )
    assert response.status_code == 200
    assert response.json()["is_primary"] is True

    detail = client.get(f"/api/v1/products/{product_id}").json()
    assert detail["image_url"] == second["url"]
    assert next(i for i in detail["images"] if i["id"] == first["id"])["is_primary"] is False


def test_suppression_image_principale_bascule(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 4")
    first = _upload_image(client, product_id, commerce_headers).json()
    second = _upload_image(client, product_id, commerce_headers).json()

    response = client.delete(
        f"/api/v1/stores/products/{product_id}/images/{first['id']}",
        headers=commerce_headers,
    )
    assert response.status_code == 204

    # La seconde image devient automatiquement principale.
    detail = client.get(f"/api/v1/products/{product_id}").json()
    assert detail["image_url"] == second["url"]
    assert len(detail["images"]) == 1
    assert detail["images"][0]["id"] == second["id"]


def test_upload_interdit_au_client(client, auth_headers):
    response = _upload_image(client, 1, auth_headers)
    assert response.status_code in (403, 404)


def test_upload_image_type_invalide(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 5")
    response = client.post(
        f"/api/v1/stores/products/{product_id}/images",
        files={"file": ("fichier.txt", b"pas une image", "text/plain")},
        headers=commerce_headers,
    )
    assert response.status_code == 415


def test_upload_sans_token(client):
    response = _upload_image(client, 1, {})
    assert response.status_code == 401


def test_liste_publique_des_images(client, commerce_headers):
    product_id = _create_product(client, commerce_headers, "Produit Image 6")
    uploaded = _upload_image(client, product_id, commerce_headers).json()
    response = client.get(f"/api/v1/stores/products/{product_id}/images")
    assert response.status_code == 200
    assert any(img["id"] == uploaded["id"] for img in response.json())