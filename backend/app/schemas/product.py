"""Schemas Pydantic des produits (recherche / fiche detaillee)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategorySummary
from app.schemas.price import PriceRead


class ProductCreate(BaseModel):
    """Donnees requises pour creer un produit (commercant)."""

    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    brand: str | None = None
    image_url: str | None = None
    category_id: int | None = None


class ProductUpdate(BaseModel):
    """Champs modifiables par le proprietaire."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    brand: str | None = None
    image_url: str | None = None
    category_id: int | None = None


class ProductListItem(BaseModel):
    """Produit dans une liste de resultats (recherche / catalogue)."""

    id: int
    name: str
    slug: str
    brand: str | None = None
    image_url: str | None = None
    category: CategorySummary | None = None
    # Statistiques de prix calculees sur les offres actives.
    min_price: float | None = None
    max_price: float | None = None
    avg_price: float | None = None
    is_available: bool = False
    store_count: int = 0
    # Fraicheur : date de la derniere mise a jour d'une offre.
    updated_at: datetime | None = None
    rating_avg: float | None = None
    rating_count: int = 0


class ProductAdminRead(BaseModel):
    """Produit dans le dashboard commerçant (avec son propre store_id)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    brand: str | None = None
    description: str | None = None
    image_url: str | None = None
    category_id: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductDetail(BaseModel):
    """Fiche produit : informations + liste complete des offres."""

    id: int
    name: str
    slug: str
    brand: str | None = None
    description: str | None = None
    image_url: str | None = None
    category: CategorySummary | None = None
    min_price: float | None = None
    max_price: float | None = None
    avg_price: float | None = None
    store_count: int = 0
    is_available: bool = False
    updated_at: datetime | None = None
    rating_avg: float | None = None
    rating_count: int = 0
    offers: list[PriceRead] = []


class ProductPage(BaseModel):
    """Reponse paginee de la recherche produits."""

    items: list[ProductListItem]
    total: int
    page: int
    page_size: int