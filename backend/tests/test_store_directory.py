"""Annuaire public des boutiques : province, filtre ville, tri distance."""


def _create_store(client, headers, name, **over):
    payload = {"name": name, "city": "Yaoundé", **over}
    response = client.post("/api/v1/stores", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


def _public(client, **params):
    response = client.get("/api/v1/stores/public", params=params or None)
    assert response.status_code == 200, response.text
    return response.json()


def test_annuaire_public_expose_les_boutiques_actives(client, commerce_headers):
    store = _create_store(
        client,
        commerce_headers,
        "Boutique Annuaire Active",
        address="Rue 1.234",
        province="Centre",
    )
    assert store["province"] == "Centre"

    data = _public(client)
    match = [s for s in data if s["id"] == store["id"]]
    assert len(match) == 1
    assert match[0]["name"] == "Boutique Annuaire Active"
    assert match[0]["province"] == "Centre"


def test_annuaire_exclut_les_boutiques_desactivees(client, commerce_headers):
    store = _create_store(client, commerce_headers, "Boutique Annuaire Desactivee")
    response = client.delete(f"/api/v1/stores/{store['id']}", headers=commerce_headers)
    assert response.status_code == 204

    data = _public(client)
    assert all(s["id"] != store["id"] for s in data)


def test_annuaire_filtre_par_ville(client, commerce_headers):
    store = _create_store(client, commerce_headers, "Boutique Bafoussam", city="Bafoussam")
    data = _public(client, city="bafoussam")
    assert any(s["id"] == store["id"] for s in data)
    assert all(s["city"] is not None and "bafoussam" in s["city"].lower() for s in data)


def test_annuaire_tri_distance_priorise_la_proximite(client, commerce_headers):
    yaounde = _create_store(
        client, commerce_headers, "Annuaire Yaounde", city="Yaoundé",
        latitude=3.8667, longitude=11.5167,
    )
    douala = _create_store(
        client, commerce_headers, "Annuaire Douala", city="Douala",
        latitude=4.0511, longitude=9.7679,
    )

    # Point de reference situe a Douala : la boutique la plus proche est Douala.
    data = _public(
        client, lat=4.0511, lng=9.7679, sort="distance"
    )
    ids = [s["id"] for s in data]

    assert douala["id"] in ids and yaounde["id"] in ids
    assert ids.index(douala["id"]) < ids.index(yaounde["id"])


def test_annuaire_tri_nom_alphabetique(client, commerce_headers):
    a = _create_store(client, commerce_headers, "Zanzibar Boutique")
    b = _create_store(client, commerce_headers, "Alpha Boutique")
    data = _public(client, sort="name")
    ids = [s["id"] for s in data]
    assert ids.index(b["id"]) < ids.index(a["id"])


def test_province_modifiable(client, commerce_headers):
    store = _create_store(client, commerce_headers, "Boutique Province", province="Littoral")
    assert store["province"] == "Littoral"

    response = client.patch(
        f"/api/v1/stores/{store['id']}",
        json={"province": "Centre"},
        headers=commerce_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json()["province"] == "Centre"


def test_creation_conserve_les_coordonnees_explicites(client, commerce_headers):
    store = _create_store(
        client,
        commerce_headers,
        "Boutique Coordonnees Manuelles",
        latitude=2.5,
        longitude=9.5,
    )
    assert store["latitude"] == 2.5
    assert store["longitude"] == 9.5