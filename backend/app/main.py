"""Point d'entree de l'API MboaFind (FastAPI).

Met en place CORS, la creation des tables en developpement (lifespan)
et monte les routers sous le prefixe /api/v1.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.database import init_db
from app.routers import auth, health, users


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Cree les tables au demarrage en developpement uniquement.

    En production, utiliser exclusivement les migrations Alembic.
    """
    if settings.ENVIRONMENT != "production":
        init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers REST sous /api/v1
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)