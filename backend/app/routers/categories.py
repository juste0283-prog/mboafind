"""Routes publiques des categories (/api/v1/categories)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.category import CategoryRead
from app.services import catalog

router = APIRouter(prefix="/categories", tags=["catalog"])


@router.get("", response_model=list[CategoryRead], summary="Lister les categories")
def list_categories(db: Session = Depends(get_db)) -> list[CategoryRead]:
    """Toutes les categories du catalogue (produits et services)."""
    return catalog.list_categories(db)