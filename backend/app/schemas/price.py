"""Schémas Pydantic des prix / offres d'un produit."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PriceVerificationStatus


class PriceCreate(BaseModel):
    """Ajouter ou mettre a jour une offre de prix pour un produit dans une boutique."""

    amount: float = Field(gt=0)
    is_available: bool = True


class PriceUpdate(BaseModel):
    """Modifier une offre de prix existante."""

    amount: float | None = Field(default=None, gt=0)
    is_available: bool | None = None


class PriceRead(BaseModel):
    """Offre de prix : un vendeur (boutique) propose un produit a un prix."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    store_id: int
    store_name: str
    store_city: str | None = None
    store_is_verified: bool = False
    store_latitude: float | None = None
    store_longitude: float | None = None
    store_rating_avg: float | None = None
    store_rating_count: int = 0
    amount: float
    currency: str
    is_available: bool
    verification_status: PriceVerificationStatus
    updated_at: datetime
    confirmed_count: int = 0
    last_confirmed_at: datetime | None = None
    trust_score: int = 0
    confirmed_by_me: bool = False


class PriceManageRead(BaseModel):
    """Offre de prix dans le dashboard commerant."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str | None = None
    amount: float
    currency: str
    is_available: bool
    verification_status: PriceVerificationStatus
    updated_at: datetime
    confirmed_count: int = 0
    trust_score: int = 0


class PriceConfirmRead(BaseModel):
    """Reponse apres confirmation d'un prix par un client."""

    price_id: int
    confirmed_count: int
    last_confirmed_at: datetime | None
    message: str = "Merci ! Votre confirmation aide la communaute."
    already_confirmed: bool = False


class PriceHistoryRead(BaseModel):
    """Ancienne valeur d'une offre de prix (historique)."""

    id: int
    amount: float
    currency: str
    is_available: bool
    changed_at: datetime