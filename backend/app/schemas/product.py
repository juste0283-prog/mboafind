"""Schemas Pydantic des produits (recherche / fiche detaillee)."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.category import CategorySummary
from app.schemas.price import PriceRead


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