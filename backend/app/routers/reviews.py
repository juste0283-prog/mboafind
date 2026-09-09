"""Routes des avis (/api/v1/reviews)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.schemas.review import ReviewCreate, ReviewPage, ReviewRead
from app.services import reviews

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("", response_model=ReviewPage, summary="Avis publics d'une cible")
def list_reviews(
    store_id: int | None = Query(default=None),
    professional_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> ReviewPage:
    """Avis approuves d'un commerce ou d'un professionnel."""
    return reviews.list_reviews(
        db, store_id=store_id, professional_id=professional_id, page=page, page_size=page_size
    )


@router.get("/mine", response_model=ReviewPage, summary="Mes avis")
def list_my_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReviewPage:
    """Les avis laisses par l'utilisateur connecte."""
    return reviews.list_my_reviews(db, current_user, page=page, page_size=page_size)


@router.post(
    "",
    response_model=ReviewRead,
    status_code=201,
    summary="Deposer un avis",
)
def create_review(
    payload: ReviewCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReviewRead:
    """Note (1-5) et commentaire sur un commerce ou un professionnel."""
    return reviews.create_review(db, current_user, payload)