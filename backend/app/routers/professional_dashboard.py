"""Routes de gestion du profil professionnel et des services."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.professional import ProfessionalCreate, ProfessionalUpdate, ServiceCreate, ServiceUpdate
from app.services import professional_mgmt

router = APIRouter(prefix="/me/professional", tags=["professional"])


@router.get("", summary="Mon profil professionnel")
def get_my_profile(
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
):
    """Retourne le profil professionnel de l'utilisateur connecte."""
    return professional_mgmt.get_my_profile(db, current_user)


@router.put("", summary="Creer ou mettre a jour mon profil professionnel")
def upsert_profile(
    payload: ProfessionalCreate,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
):
    """Cree ou met a jour le profil professionnel."""
    return professional_mgmt.create_or_update_profile(db, current_user, payload)


@router.post(
    "/services",
    status_code=201,
    summary="Ajouter un service",
)
def create_service(
    payload: ServiceCreate,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
):
    """Ajoute un service a l'offre du professionnel."""
    return professional_mgmt.create_service(db, current_user, payload)


@router.patch("/services/{service_id}", summary="Modifier un service")
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
):
    """Met a jour un service."""
    return professional_mgmt.update_service(db, current_user, service_id, payload)


@router.delete("/services/{service_id}", status_code=204, summary="Supprimer un service")
def delete_service(
    service_id: int,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
):
    """Desactive un service."""
    professional_mgmt.delete_service(db, current_user, service_id)
