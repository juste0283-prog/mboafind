"""Fixtures pytest partagees.

Les variables d'environnement sont definies AVANT l'import de l'application
pour que la configuration centrale (pydantic-settings) utilise la base de
test, pas la base de developpement.
"""

import os
from pathlib import Path

TEST_DB_PATH = Path(__file__).resolve().parent / "test_mboafind.db"

# Base de test propre a chaque session
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["SECRET_KEY"] = "test-secret-key-pour-les-tests-uniquement"
os.environ["GEOCODE_ENABLED"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database.database import init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.enums import UserRole  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Client HTTP de test branché sur l'application FastAPI."""
    init_db()
    with TestClient(app) as test_client:
        yield test_client


def _register_and_login(client: TestClient, email: str, role: UserRole):
    """Crée un utilisateur et retourne les en-têtes Bearer JWT."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "motdepasse123",
            "full_name": "Utilisateur Test",
            "role": role.value,
        },
    )
    assert response.status_code == 201, response.text

    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "motdepasse123"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def auth_headers(client: TestClient) -> dict[str, str]:
    """En-têtes JWT d'un utilisateur connecté."""
    return _register_and_login(client, "client@test.com", UserRole.CLIENT)


@pytest.fixture(scope="session")
def commerce_headers(client: TestClient) -> dict[str, str]:
    """En-têtes JWT d'un commerçant connecté."""
    return _register_and_login(client, "commercant@test.com", UserRole.COMMERCANT)


@pytest.fixture(scope="session")
def pro_headers(client: TestClient) -> dict[str, str]:
    """En-têtes JWT d'un professionnel connecté."""
    return _register_and_login(client, "pro@test.com", UserRole.PROFESSIONNEL)


@pytest.fixture(scope="session")
def admin_headers(client: TestClient) -> dict[str, str]:
    """En-têtes JWT d'un administrateur connecté."""
    return _register_and_login(client, "admin@test.com", UserRole.ADMIN)
@pytest.fixture(scope="session")
def demo_catalog(client: TestClient, commerce_headers):
    """Crée une catégorie, une boutique, un produit, deux prix et une 2e boutique.

    La population se fait directement en base (l'API admin sera hors périmètre
    client). Retourne les identifiants utilisables par les tests.
    """
    from app.database.session import SessionLocal
    from app.models import Category, Price, Product, Store, User
    from app.models.enums import CategoryType

    db = SessionLocal()
    try:
        category = db.query(Category).filter(Category.slug == "informatique").first()
        if category is None:
            category = Category(
                name="Informatique",
                slug="informatique",
                type=CategoryType.PRODUCT,
                description="Matériel informatique.",
            )
            db.add(category)
            db.flush()

        store = db.query(Store).filter(Store.name == "Boutique Test").first()
        if store is None:
            owner = db.query(User).filter(User.email == "commercant@test.com").first()
            store = Store(
                owner_id=owner.id,
                name="Boutique Test",
                description="Boutique de test.",
                city="Yaoundé",
                latitude=3.8667,
                longitude=11.5167,
                phone="+237 6 00 00 00 00",
                is_verified=True,
            )
            db.add(store)
            db.flush()

        second_store = db.query(Store).filter(Store.name == "Boutique Test 2").first()
        if second_store is None:
            second_store = Store(
                owner_id=store.owner_id,
                name="Boutique Test 2",
                description="Deuxième boutique.",
                city="Douala",
                is_verified=False,
            )
            db.add(second_store)
            db.flush()

        product = db.query(Product).filter(Product.slug == "ssd-512-go-test").first()
        if product is None:
            product = Product(
                name="SSD 512 Go Test",
                slug="ssd-512-go-test",
                category_id=category.id,
                description="SSD de test.",
            )
            db.add(product)
            db.flush()

        if db.query(Price).filter(Price.product_id == product.id).count() == 0:
            db.add(Price(product_id=product.id, store_id=store.id, amount=40000.0))
            db.add(Price(product_id=product.id, store_id=store.id, amount=38000.0))

        db.commit()
        result = {
            "category_id": category.id,
            "store_id": store.id,
            "store2_id": second_store.id,
            "product_id": product.id,
        }
        prices = (
            db.query(Price)
            .filter(Price.product_id == product.id)
            .order_by(Price.amount)
            .all()
        )
        result["price_ids"] = [p.id for p in prices]
        return result
    finally:
        db.close()


@pytest.fixture(scope="session")
def demo_professional(client: TestClient, pro_headers):
    """Crée un professionnel avec un service et retourne ses identifiants."""
    from app.database.session import SessionLocal
    from app.models import Professional, Service, User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "pro@test.com").first()
        pro = db.query(Professional).filter(Professional.user_id == user.id).first()
        if pro is None:
            pro = Professional(
                user_id=user.id,
                profession="Réparateur de téléphones",
                bio="Spécialiste smartphone.",
                city="Yaoundé",
                latitude=3.8667,
                longitude=11.5167,
            )
            db.add(pro)
            db.flush()
            db.add(
                Service(
                    professional_id=pro.id,
                    name="Changement d'écran",
                    description="Écran de téléphone.",
                    price=15000,
                )
            )
            db.commit()

        service = db.query(Service).filter(Service.professional_id == pro.id).first()
        return {"professional_id": pro.id, "service_id": service.id}
    finally:
        db.close()