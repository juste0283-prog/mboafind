"""Schemas des alertes de prix."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PriceAlertCreate(BaseModel):
    """Creation (ou mise a jour par produit) d'une alerte de prix."""

    product_id: int
    target_price: float = Field(gt=0, description="Prix cible en FCFA")
    currency: str = "XAF"


class PriceAlertUpdate(BaseModel):
    """Modification partielle d'une alerte (cible ou desactivation)."""

    target_price: float | None = Field(default=None, gt=0)
    is_active: bool | None = None


class PriceAlertRead(BaseModel):
    """Alerte enrichie (produit + prix actuel le plus bas observe)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    product_image: str | None = None
    current_price: float | None = None
    target_price: float
    currency: str
    is_active: bool
    triggered: bool
    triggered_at: datetime | None = None
    created_at: datetime
    updated_at: datetime