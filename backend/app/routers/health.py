"""Routes de sante et d'information de l'API."""

from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(tags=["system"])


@router.get("/health", summary="Etat de l'API")
def health_check() -> dict[str, str]:
    """Ping de l'API : utilise par la supervision / les tests."""
    return {"status": "ok", "version": settings.APP_VERSION}


@router.get("/", summary="Racine de l'API")
def root() -> dict[str, str]:
    """Information de base sur l'API et acces a la documentation."""
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }