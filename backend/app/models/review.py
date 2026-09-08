"""Modele avis (reviews).

Un avis porte sur un commerce OU sur un professionnel (au moins l'un des deux).
La note va de 1 a 5 et l'avis est soumis a moderation avant publication.
"""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import ReviewModerationStatus
from app.utils.time import utcnow


class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_reviews_rating_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    store_id: Mapped[int | None] = mapped_column(
        ForeignKey("stores.id", ondelete="CASCADE"), index=True
    )
    professional_id: Mapped[int | None] = mapped_column(
        ForeignKey("professionals.id", ondelete="CASCADE"), index=True
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    moderation_status: Mapped[ReviewModerationStatus] = mapped_column(
        Enum(ReviewModerationStatus),
        default=ReviewModerationStatus.PENDING,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    author: Mapped["User"] = relationship(back_populates="reviews")
    store: Mapped["Store | None"] = relationship(back_populates="reviews")
    professional: Mapped["Professional | None"] = relationship(
        back_populates="reviews"
    )

    def __repr__(self) -> str:
        return f"<Review id={self.id} rating={self.rating}>"