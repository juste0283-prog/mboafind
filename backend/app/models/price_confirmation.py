"""Modele confirmation de prix (price_confirmations).

Un utilisateur ne peut confirmer un prix qu'une seule fois : la contrainte
unique (price_id, user_id) garantit l'anti-triche du compteur de confirmations
(pilier "Prix reel" du cahier des charges).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.time import utcnow


class PriceConfirmation(Base):
    __tablename__ = "price_confirmations"
    __table_args__ = (
        UniqueConstraint("price_id", "user_id", name="uq_price_confirmation_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    price_id: Mapped[int] = mapped_column(
        ForeignKey("prices.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    price: Mapped["Price"] = relationship(back_populates="confirmations")
    user: Mapped["User"] = relationship()

    def __repr__(self) -> str:
        return (
            f"<PriceConfirmation id={self.id} "
            f"price_id={self.price_id} user_id={self.user_id}>"
        )