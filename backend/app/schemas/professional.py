"""Schemas Pydantic des professionnels et de leurs services."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.review import ReviewRead


class ServiceRead(BaseModel):
    """Service propose par un professionnel (tarif indicatif)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    professional_id: int
    name: str
    description: str | None = None
    price: float | None = None
    currency: str = "XAF"
    is_active: bool = True
    created_at: datetime


class ProfessionalListItem(BaseModel):
    """Professionnel dans une liste de resultats."""

    id: int
    profession: str
    bio: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = False
    user_name: str | None = None
    rating_avg: float | None = None
    rating_count: int = 0
    services_count: int = 0


class ProfessionalDetail(BaseModel):
    """Fiche professionnel : profil + services + avis."""

    id: int
    profession: str
    bio: str | None = None
    city: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_verified: bool = False
    user_name: str | None = None
    phone: str | None = None
    rating_avg: float | None = None
    rating_count: int = 0
    services: list[ServiceRead] = []
    reviews: list[ReviewRead] = []


class ProfessionalPage(BaseModel):
    """Reponse paginee de la recherche professionnels."""

    items: list[ProfessionalListItem]
    total: int
    page: int
    page_size: int