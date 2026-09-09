"""Schemas des favoris."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import FavoriteItemType


class FavoriteCreate(BaseModel):
    """Ajout d'un favori."""

    item_type: FavoriteItemType
    item_id: int


class FavoriteRead(BaseModel):
    """Favori enrichi (nom de l'objet sauvegarde)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    item_type: FavoriteItemType
    item_id: int
    item_name: str | None = None
    item_city: str | None = None
    created_at: datetime


class FavoriteStatus(BaseModel):
    """Indique si un objet est deja en favori (pour la fiche)."""

    item_type: FavoriteItemType
    item_id: int
    is_favorite: bool = False