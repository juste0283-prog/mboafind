"""Schemas Pydantic des demandes de service (services express)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ServiceRequestPriority, ServiceRequestStatus


class ServiceRequestCreate(BaseModel):
    """Une demande creee par le client pour un service."""

    service_id: int
    message: str | None = Field(default=None, max_length=2000)
    priority: ServiceRequestPriority = ServiceRequestPriority.NORMAL
    requested_deadline: datetime | None = None


class ServiceRequestRead(BaseModel):
    """Demande de service visible par le client (et le professionnel)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    client_id: int
    service_id: int
    service_name: str
    professional_id: int
    professional_name: str
    profession: str | None = None
    price: float | None = None
    currency: str = "XAF"
    message: str | None = None
    priority: ServiceRequestPriority = ServiceRequestPriority.NORMAL
    requested_deadline: datetime | None = None
    status: ServiceRequestStatus
    created_at: datetime
    updated_at: datetime


class ServiceRequestPage(BaseModel):
    """Reponse paginee des demandes de service du client."""

    items: list[ServiceRequestRead]
    total: int
    page: int
    page_size: int