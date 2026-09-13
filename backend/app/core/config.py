"""Configuration centralisee de l'application MboaFind.

Lectures des variables d'environnement (.env) via pydantic-settings.
Les secrets restent dans .env (jamais commites).
"""

import json

from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Parametres de l'application charges depuis l'environnement.."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENVIRONMENT: str = "development"  # development | testing | production
    APP_VERSION: str = "0.1.0"
    PROJECT_NAME: str = "MboaFind API"
    API_V1_PREFIX: str = "/api/v1"

    # Securite JWT
    SECRET_KEY: str = "change-me-en-production"  # A surcharger en production
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 h

    # Base de donnees
    DATABASE_URL: str = "sqlite:///./mboafind.db"

    # Geocodage des boutiques (position par defaut via Nominatim)
    GEOCODE_ENABLED: bool = True

    # Stockage des images de produits (uploads locaux, remplacables par un cloud)
    UPLOAD_DIR: str = "uploads"
    UPLOAD_MAX_SIZE_MB: int = 5
    UPLOAD_ALLOWED_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp", "image/gif"]

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str) -> list[str]:
        """Accepte une liste JSON (ex: ["http://a","http://b"]) ou une liste Python.."""
        if isinstance(value, str):
            value_clean = value.strip()
            if value_clean.startswith("["):
                return json.loads(value_clean)
            return [origin.strip() for origin in value_clean.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Retourne une instance unique (mise en cache) des parametres."""
    return Settings()


settings = get_settings()