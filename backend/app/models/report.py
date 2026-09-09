"""Modele signalement (reports).

Un utilisateur signale une information incorrecte : faux prix, produit
indisponible, boutique fermee, faux professionnel, localisation incorrecte,
contenu abusif... La cible est generique (target_type + target_id).
Un administrateur traite ensuite le signalement.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ReportStatus, ReportTargetType
from app.utils.time import utcnow


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    reporter_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    target_type: Mapped[ReportTargetType] = mapped_column(
        Enum(ReportTargetType), nullable=False, index=True
    )
    target_id: Mapped[int] = mapped_column(nullable=False, index=True)
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

    def __repr__(self) -> str:
        return (
            f"<Report id={self.id} "
            f"target={self.target_type.value}:{self.target_id} "
            f"reason={self.reason!r} status={self.status}>"
        )