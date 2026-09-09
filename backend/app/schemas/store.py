"""Schemas Pydantic des boutiques / commerces."""

from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductListItem
from app.schemas.review import ReviewRead


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
    latitude: float | None = None
    longitude: float | None = None
    opening_hours: str | None = None
    is_verified: bool = False
    rating_avg: float | None = None
    rating_count: int = 0


class StoreDetail(StoreRead):
    """Fiche boutique : produits vendus + avis publics."""

    products: list[ProductListItem] = []
    reviews: list[ReviewRead] = []