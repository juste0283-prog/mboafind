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
from app.schemas.admin import (
    AdminOverview,
    AdminProfessionalItem,
    AdminProfessionalList,
    AdminStoreItem,
    AdminStoreList,
    AdminUserItem,
    AdminUserList,
    AdminUserStatusUpdate,
    AdminVerifyUpdate,
)
from app.schemas.report import ReportModerationUpdate
from app.schemas.review import ReviewModerationUpdate
from app.services import admin_console, moderation

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles(UserRole.ADMIN))])


@router.get("/overview", summary="Synthese chiffree de la plateforme")
def get_overview(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminOverview:
    """Statistiques globales pour l'ecran d'accueil de la console admin."""
    return admin_console.get_overview(db)


@router.get("/stores", summary="Liste des boutiques")
def list_stores(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminStoreList:
    """Toutes les boutiques avec etat de verification et proprietaire."""
    return admin_console.list_all_stores(db)


@router.patch("/stores/{store_id}/verify", summary="Verifier / deverifier une boutique")
def verify_store(
    store_id: int,
    payload: AdminVerifyUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminStoreItem:
    """Definit le statut de verification d'une boutique et notifie son proprietaire."""
    return admin_console.set_store_verify(db, store_id, payload.is_verified)


@router.get("/professionals", summary="Liste des professionnels")
def list_professionals(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminProfessionalList:
    """Tous les professionnels avec etat de verification."""
    return admin_console.list_all_professionals(db)


@router.patch("/professionals/{professional_id}/verify", summary="Verifier / deverifier un professionnel")
def verify_professional(
    professional_id: int,
    payload: AdminVerifyUpdate,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminProfessionalItem:
    """Definit le statut de verification d'un professionnel et notifie son compte."""
    return admin_console.set_professional_verify(db, professional_id, payload.is_verified)


@router.get("/users", summary="Liste des comptes utilisateurs")
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminUserList:
    """Tous les comptes utilisateurs."""
    return admin_console.list_all_users(db)


@router.patch("/users/{user_id}/status", summary="Suspendre / reactiver un compte")
def set_user_status(
    user_id: int,
    payload: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> AdminUserItem:
    """Active ou suspend un compte utilisateur et notifie l'interesse."""
    return admin_console.set_user_status(db, user_id, payload.is_active, admin.id)


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