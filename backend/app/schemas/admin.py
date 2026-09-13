"""Schemas Pydantic de la console d'administration."""

from datetime import datetime

from pydantic import BaseModel

from app.models.enums import UserRole


class AdminOverview(BaseModel):
    """Synthese chiffree de la plateforme, pour l'ecran d'accueil admin."""

    users_total: int
    users_clients: int
    users_commersants: int
    users_professionals: int
    users_admins: int
    stores_total: int
    stores_verified: int
    stores_pending: int
    products_total: int
    prices_total: int
    categories_total: int
    reports_total: int
    reports_pending: int
    reviews_total: int
    reviews_pending: int
    service_requests_total: int
    price_updates_total: int


class AdminStoreItem(BaseModel):
    """Boutique telle que vue par l'administrateur."""

    id: int
    name: str
    city: str | None = None
    province: str | None = None
    phone: str | None = None
    is_verified: bool
    is_active: bool
    owner_email: str | None = None
    products_count: int = 0


class AdminStoreList(BaseModel):
    items: list[AdminStoreItem]
    total: int


class AdminVerifyUpdate(BaseModel):
    is_verified: bool


class AdminProfessionalItem(BaseModel):
    """Professionnel tel que vu par l'administrateur."""

    id: int
    user_id: int
    user_email: str
    user_name: str | None = None
    profession: str
    city: str | None = None
    is_verified: bool
    is_active: bool
    services_count: int = 0


class AdminProfessionalList(BaseModel):
    items: list[AdminProfessionalItem]
    total: int


class AdminUserItem(BaseModel):
    """Compte utilisateur tel que vu par l'administrateur."""

    id: int
    email: str
    full_name: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime


class AdminUserList(BaseModel):
    items: list[AdminUserItem]
    total: int


class AdminUserStatusUpdate(BaseModel):
    is_active: bool