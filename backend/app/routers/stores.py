"""Routes des boutiques (/api/v1/stores) et confirmation de prix."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.schemas.price import PriceConfirmRead
from app.schemas.store import StoreDetail
from app.services import catalog

router = APIRouter(tags=["catalog"])

stores_router = APIRouter(prefix="/stores", tags=["catalog"])
prices_router = APIRouter(prefix="/prices", tags=["catalog"])


@stores_router.get("/{store_id}", response_model=StoreDetail, summary="Fiche boutique")
def get_store(store_id: int, db: Session = Depends(get_db)) -> StoreDetail:
    """Fiche boutique : localisation, produits vendus et avis."""
    return catalog.get_store(db, store_id)


@prices_router.post(
    "/{price_id}/confirm",
    response_model=PriceConfirmRead,
    summary="Confirmer un prix observe",
)
def confirm_price(
    price_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriceConfirmRead:
    """Un client connecte confirme qu'un prix est exact (fraicheur de l'info)."""
    return catalog.confirm_price(db, price_id)