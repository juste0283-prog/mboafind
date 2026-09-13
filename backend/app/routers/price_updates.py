"""Route publique : flux temps reel des changements de prix."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.price_update import PriceUpdatePage
from app.services import catalog

router = APIRouter(prefix="/price-updates", tags=["catalog"])


@router.get(
    "",
    response_model=PriceUpdatePage,
    summary="Dernieres evolutions de prix (alertes intelligentes)",
)
def list_price_updates(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> PriceUpdatePage:
    """Les derniers changements de prix enregistres, les plus recents d'abord."""
    return catalog.list_price_updates(db, page=page, page_size=page_size)