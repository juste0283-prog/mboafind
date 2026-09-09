"""Service des demandes de service (Services Express, section 6.5).

Workflow : creee (PENDING) -> acceptee (ACCEPTED) -> en cours (IN_PROGRESS)
-> terminee (COMPLETED). Le client peut creer, suivre et annuler.
Le professionnel peut accepter, refuser, demarrer et terminer.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Professional, Service, ServiceRequest
from app.models.enums import ServiceRequestStatus
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestPage,
    ServiceRequestRead,
)


def _to_read(request: ServiceRequest) -> ServiceRequestRead:
    """Serialize une demande avec les infos du service et du professionnel."""
    service = request.service
    professional = service.professional
    return ServiceRequestRead(
        id=request.id,
        client_id=request.client_id,
        service_id=request.service_id,
        service_name=service.name,
        professional_id=professional.id,
        professional_name=professional.user.full_name or professional.user.email,
        profession=professional.profession,
        price=float(service.price) if service.price is not None else None,
        currency=service.currency,
        message=request.message,
        status=request.status,
        created_at=request.created_at,
        updated_at=request.updated_at,
    )


def _ensure_professional_owner(request: ServiceRequest, user) -> Professional:
    """Verifie que l'utilisateur est le professionnel concerne par la demande."""
    professional = user.professional
    if professional is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas de profil professionnel",
        )
    service = request.service
    if service.professional_id != professional.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cette demande ne vous est pas destinee",
        )
    return professional


# ----------------------------------------------- cote client
def create_request(
    db: Session, client, payload: ServiceRequestCreate
) -> ServiceRequestRead:
    """Le client cree une demande de service (statut initial ''creee'')."""
    service = db.get(Service, payload.service_id)
    if service is None or not service.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service introuvable ou indisponible",
        )
    request = ServiceRequest(
        client_id=client.id,
        service_id=service.id,
        message=payload.message,
        status=ServiceRequestStatus.PENDING,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return _to_read(request)


def list_my_requests(
    db: Session, client, page: int = 1, page_size: int = 20
) -> ServiceRequestPage:
    """Historique des demandes du client (suivi de statut)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = db.query(ServiceRequest).filter(ServiceRequest.client_id == client.id)
    total = base.count()
    requests = (
        base.order_by(ServiceRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ServiceRequestPage(
        items=[_to_read(r) for r in requests],
        total=total,
        page=page,
        page_size=page_size,
    )


def cancel_request(db: Session, client, request_id: int) -> ServiceRequestRead:
    """Le client annule une demande encore modifiable (creee ou acceptee)."""
    request = db.get(ServiceRequest, request_id)
    if request is None or request.client_id != client.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable"
        )
    if request.status not in (
        ServiceRequestStatus.PENDING,
        ServiceRequestStatus.ACCEPTED,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Cette demande ne peut plus etre annulee "
                f"(statut actuel: {request.status.label_fr})."
            ),
        )
    request.status = ServiceRequestStatus.CANCELLED
    db.add(request)
    db.commit()
    db.refresh(request)
    return _to_read(request)


# ------------------------------------------------ cote professionnel
def list_professional_requests(
    db: Session, user, page: int = 1, page_size: int = 20
) -> ServiceRequestPage:
    """Demandes recues par le professionnel connecte."""
    professional = user.professional
    if professional is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'avez pas de profil professionnel",
        )
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    service_ids = [s.id for s in professional.services]
    base = db.query(ServiceRequest).filter(ServiceRequest.service_id.in_(service_ids))
    total = base.count()
    requests = (
        base.order_by(ServiceRequest.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ServiceRequestPage(
        items=[_to_read(r) for r in requests],
        total=total,
        page=page,
        page_size=page_size,
    )


def _change_status(
    db: Session,
    user,
    request_id: int,
    allowed_from: tuple[ServiceRequestStatus, ...],
    new_status: ServiceRequestStatus,
) -> ServiceRequestRead:
    """Helper generique de changement de statut par le professionnel."""
    request = db.get(ServiceRequest, request_id)
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Demande introuvable"
        )
    _ensure_professional_owner(request, user)
    if request.status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Impossible de passer de "
                f"{request.status.label_fr} a {new_status.label_fr}"
            ),
        )
    request.status = new_status
    db.add(request)
    db.commit()
    db.refresh(request)
    return _to_read(request)


def accept_request(db: Session, user, request_id: int) -> ServiceRequestRead:
    """Le professionnel accepte une demande (creee -> acceptee)."""
    return _change_status(
        db, user, request_id,
        (ServiceRequestStatus.PENDING,),
        ServiceRequestStatus.ACCEPTED,
    )


def decline_request(db: Session, user, request_id: int) -> ServiceRequestRead:
    """Le professionnel refuse une demande (creee -> refusee)."""
    return _change_status(
        db, user, request_id,
        (ServiceRequestStatus.PENDING,),
        ServiceRequestStatus.DECLINED,
    )


def start_request(db: Session, user, request_id: int) -> ServiceRequestRead:
    """Le professionnel demarre l'intervention (acceptee -> en cours)."""
    return _change_status(
        db, user, request_id,
        (ServiceRequestStatus.ACCEPTED,),
        ServiceRequestStatus.IN_PROGRESS,
    )


def complete_request(db: Session, user, request_id: int) -> ServiceRequestRead:
    """Le professionnel termine l'intervention (en cours -> terminee)."""
    return _change_status(
        db, user, request_id,
        (ServiceRequestStatus.IN_PROGRESS,),
        ServiceRequestStatus.COMPLETED,
    )