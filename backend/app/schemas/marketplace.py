"""Schemas Pydantic de la vitrine « Marketplace »."""

from datetime import datetime

from pydantic import BaseModel

from app.schemas.category import CategorySummary


class CategoryCount(BaseModel):
    """Categorie du catalogue avec son nombre de produits disponibles."""

    id: int
    name: str
    slug: str
    count: int = 0


class MarketplaceItem(BaseModel):
    """Produit de la vitrine multi-boutiques.

    Meme structure que ProductListItem, enrichi de `deal_drop_percent`
    (meilleure baisse de prix observee sur ses offres, en %).
    """

    id: int
    name: str
    slug: str
    brand: str | None = None
    image_url: str | None = None
    category: CategorySummary | None = None
    min_price: float | None = None
    max_price: float | None = None
    avg_price: float | None = None
    store_count: int = 0
    is_available: bool = False
    rating_avg: float | None = None
    rating_count: int = 0
    updated_at: datetime | None = None
    deal_drop_percent: float | None = None


class MarketplacePage(BaseModel):
    """Vitrine : categories (avec compteurs) + produits pagines."""

    categories: list[CategoryCount] = []
    items: list[MarketplaceItem] = []
    total: int = 0
    page: int = 1
    page_size: int = 20