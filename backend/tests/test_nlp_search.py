"""Tests de la recherche en langage naturel."""

import pytest

from app.services.nlp_search import parse_natural_query
from app.database.session import SessionLocal


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


def test_parse_budget_et_ville(db, demo_catalog):
    """« moins de 200 000 » -> prix max ; « Yaoundé » -> ville."""
    parsed = parse_natural_query(
        db, "ordinateur portable à Yaoundé, moins de 200 000 FCFA"
    )
    assert parsed.max_price == 200000
    assert parsed.min_price is None
    assert parsed.city == "Yaoundé"
    assert "ordinateur" in parsed.search
    assert "portable" in parsed.search
    assert parsed.detected is True


def test_parse_fourchette(db, demo_catalog):
    """« entre 50 000 et 100 000 » -> bornes min/max."""
    parsed = parse_natural_query(db, "entre 50 000 et 100 000")
    assert parsed.min_price == 50000
    assert parsed.max_price == 100000


def test_parse_categorie(db, demo_catalog):
    """Un mot-cle qui coincide avec une categorie est identifie."""
    parsed = parse_natural_query(db, "informatique douala sous 150000")
    assert parsed.category_name == "Informatique"
    assert parsed.max_price == 150000
    assert parsed.city == "Douala"
    assert parsed.search == ""


def test_parse_budget_nu(db, demo_catalog):
    """« 200 000 FCFA » seul est interprete comme budget max."""
    parsed = parse_natural_query(db, "200000 fcfa")
    assert parsed.max_price == 200000


def test_endpoint_budget_city(client, demo_catalog):
    """L'endpoint filtre reellement les resultats par ville et budget."""
    response = client.get(
        "/api/v1/products/natural",
        params={"q": "ssd à yaoundé moins de 50 000"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    interpretation = data["interpretation"]
    assert interpretation["city"] == "Yaoundé"
    assert interpretation["max_price"] == 50000
    assert data["total"] >= 1
    names = {item["name"] for item in data["items"]}
    assert "SSD 512 Go Test" in names


def test_endpoint_sans_filtre(client, demo_catalog):
    """Sans mot-cle structurel, la recherche textuelle classique s'applique."""
    response = client.get("/api/v1/products/natural", params={"q": "ssd"})
    assert response.status_code == 200
    data = response.json()
    assert data["interpretation"]["detected"] is False
    assert data["total"] >= 1


def test_endpoint_requiert_texte(client):
    """q est obligatoire."""
    assert client.get("/api/v1/products/natural").status_code == 422