"""Modele professionnel (professionals).

Un utilisateur avec le role PROFESSIONNEL peut avoir un profil detaille :
profession, biographie, ville et coordonnees geographiques.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.time import utcnow


class Professional(Base):
    __tablename__ = "professionals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )
    profession: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    bio: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(120), index=True)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    is_verified: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    user: Mapped["User"] = relationship(back_populates="professional")
    services: Mapped[list["Service"]] = relationship(
        back_populates="professional", cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(back_populates="professional")

    def __repr__(self) -> str:
        return (
            f"<Professional id={self.id} "
            f"profession={self.profession!r} city={self.city!r}>"
        )