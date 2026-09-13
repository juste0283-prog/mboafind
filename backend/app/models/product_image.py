"""Modele image de produit (product_images).

Un produit peut avoir plusieurs images : une image principale (is_primary)
utilisee pour les listes et le partage, plus une galerie. L'ordre d'affichage
est controle par le champ position. Le fichier est stocke sur disque (dossier
d'uploads) et reference par son URL relative; l'architecture permet d'evoquer
autrement vers un stockage cloud sans changer les schemas ni les routes.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.utils.time import utcnow


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    position: Mapped[int] = mapped_column(default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow
    )

    # Relations
    product: Mapped["Product"] = relationship(back_populates="images")

    def __repr__(self) -> str:
        return f"<ProductImage id={self.id} product={self.product_id} primary={self.is_primary}>"