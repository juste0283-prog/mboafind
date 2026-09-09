"""Modele historique des prix (price_histories).

Conserve les anciennes valeurs d'une offre de prix afin de pouvoir calculer
plus tard : moyenne, minimum, maximum, evolution, tendance (section 8 du
cahier des charges - historique des prix).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.time import utcnow


class PriceHistory(Base):
    __tablename__ = "price_histories"

    id: Mapped[int] = mapped_column(primary_key=True)
    price_id: Mapped[int] = mapped_column(
        ForeignKey("prices.id", ondelete="CASCADE"), index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="XAF", nullable=False)
    is_available: Mapped[bool] = mapped_column(default=True)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, index=True
    )

    # Relations
    price: Mapped["Price"] = relationship(back_populates="history")

    def __repr__(self) -> str:
        return f"<PriceHistory id={self.id} amount={self.amount}>"