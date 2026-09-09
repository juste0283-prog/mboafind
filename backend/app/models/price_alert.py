"""Modele alerte de prix (price_alerts).

Un client installe une alerte sur un produit : lorsque le prix le plus bas
disponible passe sous ou egal au prix cible, l'alerte est marquee declenchee
et apparait dans son compte. Une seule alerte par (client, produit).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.time import utcnow


class PriceAlert(Base):
    __tablename__ = "price_alerts"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_price_alert_user_product"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    target_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="XAF", nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    triggered: Mapped[bool] = mapped_column(default=False, nullable=False)
    triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relations
    user: Mapped["User"] = relationship(back_populates="price_alerts")
    product: Mapped["Product"] = relationship(back_populates="price_alerts")

    def __repr__(self) -> str:
        return (
            f"<PriceAlert id={self.id} user={self.user_id} "
            f"product={self.product_id} target={self.target_price}>"
        )