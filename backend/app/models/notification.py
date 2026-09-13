"""Modele notification in-app (notifications).

Une notification est creee lors d'un evenement metier (alerte de prix
atteinte, demande de service recue ou changee de statut, moderation d'un
signalement, confirmation de prix). Le suivi est simple : lu / non lu.
Le champ ``data`` stocke un payload JSON (identifiants de contexte) pour
permettre une navigation ciblee cote frontend.
"""

import json
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import NotificationType
from app.utils.time import utcnow


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[str | None] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relations
    user: Mapped["User"] = relationship(back_populates="notifications")

    @property
    def data_dict(self) -> dict | None:
        """Payload JSON decode, ou None si vide."""
        return json.loads(self.data) if self.data else None

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user={self.user_id} type={self.type.value}>"