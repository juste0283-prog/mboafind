"""Schemas Pydantic du flux temps reel des changements de prix."""

from datetime import datetime

from pydantic import BaseModel


class PriceUpdateRead(BaseModel):
    """Une evolution de prix visible publiquement (alertes intelligentes)."""

    id: int
    product_id: int
    product_name: str
    image_url: str | None = None
    store_id: int
    store_name: str
    store_city: str | None = None
    amount: float
    currency: str = "XAF"
    is_available: bool
    changed_at: datetime
    previous_amount: float | None = None
    drop_percent: float = 0.0


class PriceUpdatePage(BaseModel):
    """Reponse paginee du flux des changements de prix."""

    items: list[PriceUpdateRead]
    total: int
    page: int
    page_size: int