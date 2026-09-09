"""Service des signalements (section 6.6 Confiance et moderation).

Un utilisateur signale une information incorrecte : prix incorrect, produit
indisponible, boutique fermee, faux professionnel, localisation incorrecte,
contenu abusif, autre. La cible est verifiee avant enregistrement.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import (
    Price,
    Product,
    Professional,
    Report,
    Review,
    Service,
    Store,
    User,
)
from app.models.enums import ReportStatus, ReportTargetType
from app.schemas.report import ReportCreate, ReportPage, ReportRead


def _target_exists(db: Session, target_type: ReportTargetType, target_id: int) -> bool:
    """Verifie que l'objet signale existe (et est public/actif)."""
    model_by_type = {
        ReportTargetType.PRICE: Price,
        ReportTargetType.PRODUCT: Product,
        ReportTargetType.STORE: Store,
        ReportTargetType.PROFESSIONAL: Professional,
        ReportTargetType.SERVICE: Service,
        ReportTargetType.REVIEW: Review,
        ReportTargetType.USER: User,
    }
    model = model_by_type[target_type]
    obj = db.get(model, target_id)
    if obj is None:
        return False
    if isinstance(obj, Product) and not obj.is_active:
        return False
    if isinstance(obj, Store) and not obj.is_active:
        return False
    return True


def create_report(db: Session, reporter, payload: ReportCreate) -> ReportRead:
    """Cree un signalement (statut initial ''nouveau'' = PENDING)."""
    if not _target_exists(db, payload.target_type, payload.target_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="L'objet que vous voulez signaler est introuvable",
        )
    report = Report(
        reporter_id=reporter.id,
        target_type=payload.target_type,
        target_id=payload.target_id,
        reason=payload.reason,
        description=payload.description,
        status=ReportStatus.PENDING,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def list_my_reports(
    db: Session, reporter, page: int = 1, page_size: int = 20
) -> ReportPage:
    """Historique des signalements deposes par l'utilisateur courant."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = (
        db.query(Report)
        .filter(Report.reporter_id == reporter.id)
        .order_by(Report.created_at.desc())
    )
    total = base.count()
    reports = base.offset((page - 1) * page_size).limit(page_size).all()
    return ReportPage(
        items=list(reports), total=total, page=page, page_size=page_size
    )