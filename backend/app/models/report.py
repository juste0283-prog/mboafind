"""Modele signalement (reports).

Un utilisateur signale une information incorrecte (prix, produit, contenu).
Un administrateur traite ensuite le signalement.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ReportStatus
from app.utils.time import utcnow


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    price_id: Mapped[int | None] = mapped_column(
        ForeignKey("prices.id", ondelete="SET NULL"), index=True
    )
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus), default=ReportStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    reporter: Mapped["User"] = relationship(back_populates="reports")
    price: Mapped["Price | None"] = relationship(back_populates="reports")

    def __repr__(self) -> str:
        return (
            f"<Report id={self.id} reason={self.reason!r} status={self.status}>"
        )