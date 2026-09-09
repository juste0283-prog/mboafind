"""Modele favori (favorites).

Un utilisateur peut sauvegarder des produits, des commerces et des
professionnels pour les retrouver plus tard. La contrainte unique
(user_id, item_type, item_id) empeche les doublons.
"""

from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import FavoriteItemType
from app.utils.time import utcnow


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint("user_id", "item_type", "item_id", name="uq_favorite_user_item"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    item_type: Mapped[FavoriteItemType] = mapped_column(
        Enum(FavoriteItemType), nullable=False, index=True
    )
    item_id: Mapped[int] = mapped_column(nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    user: Mapped["User"] = relationship(back_populates="favorites")

    def __repr__(self) -> str:
        return (
            f"<Favorite id={self.id} "
            f"item={self.item_type.value}:{self.item_id}>"
        )