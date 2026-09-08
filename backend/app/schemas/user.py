"""Schemas Pydantic des utilisateurs (Create / Read / Update)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import UserRole


class UserBase(BaseModel):
    """Champs communs d'un utilisateur."""

    email: EmailStr
    full_name: str | None = None
    phone: str | None = None


class UserCreate(UserBase):
    """Donnees requises pour creer un compte."""

    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.CLIENT


class UserRead(UserBase):
    """Representation publique d'un utilisateur (jamais le hash)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    """Champs modifiables par l'utilisateur lui-meme."""

    full_name: str | None = None
    phone: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)