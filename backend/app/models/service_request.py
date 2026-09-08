"""Modele demande de service (service_requests).

Un client fait une demande a un professionnel pour un service precis.
Le professionnel peut l'accepter, la refuser ou la marquer terminee.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ServiceRequestStatus
from app.utils.time import utcnow


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    service_id: Mapped[int] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), index=True
    )
    message: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ServiceRequestStatus] = mapped_column(
        Enum(ServiceRequestStatus),
        default=ServiceRequestStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relations
    client: Mapped["User"] = relationship()
    service: Mapped["Service"] = relationship(back_populates="requests")

    def __repr__(self) -> str:
        return (
            f"<ServiceRequest id={self.id} "
            f"service_id={self.service_id} status={self.status}>"
        )