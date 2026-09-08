"""Schemas Pydantic pour l'authentification (login / token)."""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Identifiants de connexion."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Token JWT retourne apres une connexion reussie."""

    access_token: str
    token_type: str = "bearer"