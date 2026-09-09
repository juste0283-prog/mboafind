"""Routes des demandes de service (/api/v1/service-requests), cote client."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestPage,
    ServiceRequestRead,
)
from app.services import service_requests

router = APIRouter(prefix="/service-requests", tags=["service-requests"])


@router.post(
    "",
    response_model=ServiceRequestRead,
    status_code=201,
    summary="Envoyer une demande de service",
)
def create_request(
    payload: ServiceRequestCreate,
    current_user=Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Le client envoie une demande a un professionnel pour un service."""
    return service_requests.create_request(db, current_user, payload)


@router.get("", response_model=ServiceRequestPage, summary="Mes demandes de service")
def list_my_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user=Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ServiceRequestPage:
    """Historique des demandes du client (suivi de statut)."""
    return service_requests.list_my_requests(db, current_user, page=page, page_size=page_size)


@router.patch(
    "/{request_id}/cancel",
    response_model=ServiceRequestRead,
    summary="Annuler une demande",
)
def cancel_request(
    request_id: int,
    current_user=Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Annule une demande encore en statut ''creee'' ou ''acceptee''."""
    return service_requests.cancel_request(db, current_user, request_id)


# ------------------------------------------------- cote professionnel
@router.get(
    "/inbox",
    response_model=ServiceRequestPage,
    summary="Demandes recues (professionnel)",
)
def list_professional_requests(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
) -> ServiceRequestPage:
    """Les demandes recues par le professionnel connecte (inbox)."""
    return service_requests.list_professional_requests(
        db, current_user, page=page, page_size=page_size
    )


@router.patch(
    "/{request_id}/accept",
    response_model=ServiceRequestRead,
    summary="Accepter une demande (professionnel)",
)
def accept_request(
    request_id: int,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Le professionnel accepte une demande (creee -> acceptee)."""
    return service_requests.accept_request(db, current_user, request_id)


@router.patch(
    "/{request_id}/decline",
    response_model=ServiceRequestRead,
    summary="Refuser une demande (professionnel)",
)
def decline_request(
    request_id: int,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Le professionnel refuse une demande (creee -> refusee)."""
    return service_requests.decline_request(db, current_user, request_id)


@router.patch(
    "/{request_id}/start",
    response_model=ServiceRequestRead,
    summary="Demarrer l'intervention (professionnel)",
)
def start_request(
    request_id: int,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Le professionnel demarre l'intervention (acceptee -> en cours)."""
    return service_requests.start_request(db, current_user, request_id)


@router.patch(
    "/{request_id}/complete",
    response_model=ServiceRequestRead,
    summary="Terminer l'intervention (professionnel)",
)
def complete_request(
    request_id: int,
    current_user=Depends(require_roles(UserRole.PROFESSIONNEL)),
    db: Session = Depends(get_db),
) -> ServiceRequestRead:
    """Le professionnel termine l'intervention (en cours -> terminee)."""
    return service_requests.complete_request(db, current_user, request_id)