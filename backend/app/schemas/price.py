"""Schemas Pydantic des prix / offres d'un produit."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import PriceVerificationStatus


class PriceRead(BaseModel):
    """Offre de prix : un vendeur (boutique) propose un produit a un prix."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    store_name: str
    store_city: str | None = None
    store_is_verified: bool = False
    amount: float
    currency: str
    is_available: bool
    verification_status: PriceVerificationStatus
    updated_at: datetime
    confirmed_count: int = 0
    last_confirmed_at: datetime | None = None


class PriceConfirmRead(BaseModel):
    """Reponse apres confirmation d'un prix par un client."""

    price_id: int
    confirmed_count: int
    last_confirmed_at: datetime
    message: str = "Merci ! Votre confirmation aide la communaute."