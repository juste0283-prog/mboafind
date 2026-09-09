"""Routes admin (/api/v1/admin)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_roles
from app.models.enums import (
    ReportStatus,
    ReportTargetType,
    ReviewModerationStatus,
    UserRole,
)
from app.models.user import User
from app.schemas.report import ReportModerationUpdate
from app.schemas.review import ReviewModerationUpdate
from app.services import moderation

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("/reports", summary="File de moderation des signalements")
def list_reports(
    status: ReportStatus | None = Query(default=None),
    target_type: ReportTargetType | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict:
    """Signalements a traiter (par defaut en attente, plus anciens d'abord)."""
    return moderation.list_all_reports(
        db, status_filter=status, target_type=target_type, page=page, page_size=page_size
    )


@router.patch("/reports/{report_id}", summary="Decision de moderation d'un signalement")
def decide_report(
    report_id: int,
    payload: ReportModerationUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict:
    """Resout (RESOLVED) ou classe sans suite (DISMISSED) un signalement."""
    return moderation.decide_report(db, report_id, payload.status)


@router.get("/reviews", summary="File de moderation des avis")
def list_reviews(
    moderation_status: ReviewModerationStatus | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> dict:
    """Avis a moderer (par defaut en attente, plus anciens d'abord)."""
    return moderation.list_all_reviews(
        db, moderation_status=moderation_status, page=page, page_size=page_size
    )


@router.patch("/reviews/{review_id}", summary="Decision de moderation d'un avis")
def decide_review(
    review_id: int,
    payload: ReviewModerationUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Approuve ou rejette un avis."""
    return moderation.decide_review(db, review_id, payload)