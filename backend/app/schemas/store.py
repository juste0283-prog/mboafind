"""Schemas Pydantic des boutiques / commerces."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductListItem
from app.schemas.review import ReviewRead


class StoreCreate(BaseModel):
    """Donnees requises pour creer une boutique (commercant)."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    province: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    opening_hours: str | None = None
    banner_url: str | None = None
    logo_url: str | None = None


class StoreUpdate(BaseModel):
    """Champs modifiables par le proprietaire d'une boutique."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    province: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    opening_hours: str | None = None
    banner_url: str | None = None
    logo_url: str | None = None


class StoreRead(BaseModel):
    """Boutique publique (sans la liste des produits)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    province: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: str | None = None
    is_verified: bool = False
    is_active: bool = True
    owner_id: int
    rating_avg: float | None = None
    rating_count: int = 0
    banner_url: str | None = None
    logo_url: str | None = None


class StoreDetail(StoreRead):
    """Fiche boutique : produits vendus + avis publics."""

    products: list[ProductListItem] = []
    reviews: list[ReviewRead] = []