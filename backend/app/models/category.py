"""Modele categorie (categories).

Les categories du catalogue peuvent etre de type PRODUIT ou SERVICE
(voir cahier des charges : categories id, nom, type, description).
"""

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import CategoryType


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False, index=True)
    type: Mapped[CategoryType] = mapped_column(
        Enum(CategoryType), default=CategoryType.PRODUCT, nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(500))

    # Relations
    products: Mapped[list["Product"]] = relationship(back_populates="category")

    def __repr__(self) -> str:
        return f"<Category id={self.id} name={self.name!r} type={self.type.value}>"