"""Schemas Pydantic des categories (lecture publique)."""

from pydantic import BaseModel, ConfigDict


class CategoryRead(BaseModel):
    """Categorie du catalogue (produits et/ou services)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str
    description: str | None = None


class CategorySummary(BaseModel):
    """Resume de categorie embarque dans les fiches produits/services."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    slug: str