"""Modele prix propose par un commerce pour un produit (prices)."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import PriceVerificationStatus
from app.utils.time import utcnow


class Price(Base):
    __tablename__ = "prices"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    store_id: Mapped[int] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"), index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="XAF", nullable=False)
    is_available: Mapped[bool] = mapped_column(default=True)
    verification_status: Mapped[PriceVerificationStatus] = mapped_column(
        Enum(PriceVerificationStatus), default=PriceVerificationStatus.PENDING, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    # Relations
    product: Mapped["Product"] = relationship(back_populates="prices")
    store: Mapped["Store"] = relationship(back_populates="prices")
    reports: Mapped[list["Report"]] = relationship(back_populates="price")

    def __repr__(self) -> str:
        return f"<Price id={self.id} amount={self.amount} {self.currency}>"