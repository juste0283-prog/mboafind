"""Schemas Pydantic des notifications in-app."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class NotificationRead(BaseModel):
    """Notification telle qu'exposee a l'utilisateur connecte."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    message: str
    data: dict | None = None
    is_read: bool
    created_at: datetime
    read_at: datetime | None = None


class NotificationListResponse(BaseModel):
    """Page de notifications avec le compte des non lues."""

    items: list[NotificationRead]
    total: int
    unread: int


class UnreadCountResponse(BaseModel):
    """Compte des notifications non lues (badge de la cloche)."""

    count: int