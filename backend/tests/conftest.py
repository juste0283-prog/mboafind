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

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database.database import init_db  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Client HTTP de test branché sur l'application FastAPI."""
    init_db()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def auth_headers(client: TestClient) -> dict[str, str]:
    """Crée un utilisateur et retourne les en-têtes Bearer JWT."""
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "client@test.com",
            "password": "motdepasse123",
            "full_name": "Client Test",
        },
    )
    assert response.status_code == 201, response.text

    response = client.post(
        "/api/v1/auth/login",
        json={"email": "client@test.com", "password": "motdepasse123"},
    )
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}