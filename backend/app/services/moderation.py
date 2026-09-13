"""Service de moderation admin (signalements et avis).

L'administrateur traite les anomalies signalees par la communaute :
- signalements : marquer RESOLVED (le probleme a ete regle) ou DISMISSED
  (sans suite : signalement errone ou abus de signalement) ;
- avis : APPROVED / REJECTED / PENDING via ReviewModerationStatus.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Report, Review
from app.models.enums import (
    NotificationType,
    ReportStatus,
    ReportTargetType,
    ReviewModerationStatus,
)
from app.schemas.review import ReviewModerationUpdate, ReviewRead
from app.services.notifications import create_notification


def _report_admin_read(db: Session, report: Report) -> dict:
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reporter_name": (
            f"{report.reporter.full_name}" if report.reporter else None
        ),
        "target_type": report.target_type,
        "target_id": report.target_id,
        "reason": report.reason,
        "description": report.description,
        "status": report.status,
        "created_at": report.created_at,
    }


def list_all_reports(
    db: Session,
    status_filter: ReportStatus | None = None,
    target_type: ReportTargetType | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """File de moderation : signalements (par defaut en attente, plus anciens d'abord)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = db.query(Report)
    if status_filter is not None:
        base = base.filter(Report.status == status_filter)
    if target_type is not None:
        base = base.filter(Report.target_type == target_type)
    total = base.count()
    reports = (
        base.order_by(Report.created_at.asc(), Report.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_report_admin_read(db, r) for r in reports],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def decide_report(
    db: Session, report_id: int, new_status: ReportStatus
) -> dict:
    """Applique la decision de l'administrateur sur un signalement."""
    report = db.get(Report, report_id)
    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Signalement introuvable"
        )
    report.status = new_status
    db.add(report)
    if report.reporter_id is not None:
        if new_status == ReportStatus.RESOLVED:
            create_notification(
                db,
                report.reporter_id,
                NotificationType.REPORT_RESOLVED,
                title="Signalement traite",
                message="Merci ! Votre signalement a ete traite par l'equipe de moderation.",
                data={"report_id": report.id},
            )
        elif new_status == ReportStatus.DISMISSED:
            create_notification(
                db,
                report.reporter_id,
                NotificationType.REPORT_DISMISSED,
                title="Signalement classe sans suite",
                message="Votre signalement a ete examine mais classe sans suite.",
                data={"report_id": report.id},
            )
    db.commit()
    db.refresh(report)
    return _report_admin_read(db, report)


def list_all_reviews(
    db: Session,
    moderation_status: ReviewModerationStatus | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """File de moderation : avis (par defaut en attente, plus anciens d'abord)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = db.query(Review)
    if moderation_status is not None:
        base = base.filter(Review.moderation_status == moderation_status)
    total = base.count()
    reviews = (
        base.order_by(Review.created_at.asc(), Review.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for r in reviews:
        author = r.author
        items.append(
            ReviewRead(
                id=r.id,
                author_id=r.author_id,
                author_name=(author.full_name or author.email) if author else None,
                store_id=r.store_id,
                professional_id=r.professional_id,
                rating=r.rating,
                comment=r.comment,
                moderation_status=r.moderation_status,
                created_at=r.created_at,
            )
        )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def decide_review(
    db: Session, review_id: int, payload: ReviewModerationUpdate
) -> ReviewRead:
    """Applique la decision de l'administrateur sur un avis."""
    review = db.get(Review, review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Avis introuvable"
        )
    review.moderation_status = payload.moderation_status
    db.add(review)
    db.commit()
    db.refresh(review)
    author = review.author
    return ReviewRead(
        id=review.id,
        author_id=review.author_id,
        author_name=(author.full_name or author.email) if author else None,
        store_id=review.store_id,
        professional_id=review.professional_id,
        rating=review.rating,
        comment=review.comment,
        moderation_status=review.moderation_status,
        created_at=review.created_at,
    )