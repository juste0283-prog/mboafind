"""Routes des favoris (/api/v1/favorites)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.enums import FavoriteItemType
from app.models.user import User
from app.schemas.favorite import FavoriteCreate, FavoriteRead, FavoriteStatus
from app.services import favorites

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=list[FavoriteRead], summary="Mes favoris")
def list_favorites(
    item_type: FavoriteItemType | None = Query(default=None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """Favoris de l'utilisateur connecte (filtre optionnel par type)."""
    return favorites.list_favorites(db, current_user, item_type=item_type)


@router.get(
    "/status",
    response_model=FavoriteStatus,
    summary="Statut favori d'un objet",
)
def favorite_status(
    item_type: FavoriteItemType,
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> FavoriteStatus:
    """Indique si l'objet est deja dans les favoris de l'utilisateur."""
    return FavoriteStatus(
        item_type=item_type,
        item_id=item_id,
        is_favorite=favorites.is_favorite(db, current_user.id, item_type, item_id),
    )


@router.post("", response_model=FavoriteRead, status_code=201, summary="Ajouter un favori")
def add_favorite(
    payload: FavoriteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Ajoute un favori (idempotent, sans doublon)."""
    fav = favorites.add_favorite(db, current_user, payload.item_type, payload.item_id)
    return favorites.build_favorite_read(db, fav)


@router.delete(
    "/{item_type}/{item_id}",
    status_code=204,
    summary="Retirer un favori",
)
def remove_favorite(
    item_type: FavoriteItemType,
    item_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Retire un favori (idempotent meme si absent)."""
    favorites.remove_favorite(db, current_user, item_type, item_id)