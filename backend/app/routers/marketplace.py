"""Routes publiques de la vitrine Marketplace (/api/v1/marketplace)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.marketplace import MarketplacePage
from app.services import catalog

router = APIRouter(prefix="/marketplace", tags=["marketplace"])


@router.get("", response_model=MarketplacePage, summary="Vitrine marketplace")
def marketplace(
    category_id: int | None = Query(default=None, description="Filtre categorie"),
    sort: str = Query(
        default="price_asc",
        pattern="^(price_asc|price_desc|recent|deals)$",
        description="Tri",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> MarketplacePage:
    """Vitrine multi-boutiques : categories, produits et bons plans."""
    return catalog.marketplace(
        db, category_id=category_id, sort=sort, page=page, page_size=page_size
    )