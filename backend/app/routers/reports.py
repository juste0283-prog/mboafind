"""Routes des signalements (/api/v1/reports), cote utilisateur."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.schemas.report import ReportCreate, ReportPage, ReportRead
from app.services import reports

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post(
    "",
    response_model=ReportRead,
    status_code=201,
    summary="Signaler une information incorrecte",
)
def create_report(
    payload: ReportCreate,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReportRead:
    """Signale un prix, produit, boutique, professionnel, service ou avis."""
    return reports.create_report(db, current_user, payload)


@router.get("/mine", response_model=ReportPage, summary="Mes signalements")
def list_my_reports(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ReportPage:
    """Historique des signalements deposes par l'utilisateur connecte."""
    return reports.list_my_reports(db, current_user, page=page, page_size=page_size)