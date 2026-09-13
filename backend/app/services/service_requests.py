"""Service des demandes de service (Services Express, section 6.5).

Workflow : creee (PENDING) -> acceptee (ACCEPTED) -> en cours (IN_PROGRESS)
-> terminee (COMPLETED). Le client peut creer, suivre et annuler.
Le professionnel peut accepter, refuser, demarrer et terminer.
"""

from datetime import timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Professional, Service, ServiceRequest
from app.models.enums import (
    NotificationType,
    ServiceRequestPriority,
    ServiceRequestStatus,
)
from app.schemas.service_request import (
    ServiceRequestCreate,
    ServiceRequestPage,
    ServiceRequestRead,
)
from app.services.notifications import create_notification
from app.utils.time import utcnow


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
        priority=request.priority,
        requested_deadline=request.requested_deadline,
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
    deadline = payload.requested_deadline
    if deadline is not None:
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        if deadline < utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="L'echeance demandee est deja passee",
            )
    request = ServiceRequest(
        client_id=client.id,
        service_id=service.id,
        message=payload.message,
        priority=payload.priority,
        requested_deadline=deadline,
        status=ServiceRequestStatus.PENDING,
    )
    db.add(request)
    professional = service.professional
    express = request.priority == ServiceRequestPriority.EXPRESS
    if professional is not None and professional.user_id != client.id:
        title = "Nouvelle demande urgente" if express else "Nouvelle demande de service"
        message = (
            f"{client.full_name or client.email} vous sollicite en priorite pour "
            f"« {service.name} »."
            + (f" A faire avant le {deadline:%d/%m/%Y}." if deadline else "")
            if express
            else f"{client.full_name or client.email} vous sollicite pour "
            f"« {service.name} »."
        )
        create_notification(
            db,
            professional.user_id,
            NotificationType.SERVICE_REQUEST_RECEIVED,
            title=title,
            message=message,
            data={"request_id": request.id, "service_id": service.id},
        )
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
    professional = request.service.professional
    if professional is not None and professional.user_id != client.id:
        create_notification(
            db,
            professional.user_id,
            NotificationType.REQUEST_CANCELLED,
            title="Demande annulee",
            message=(
                f"{client.full_name or client.email} a annule sa demande pour "
                f"« {request.service.name} »."
            ),
            data={"request_id": request.id, "service_id": request.service_id},
        )
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
        base.order_by(
            (ServiceRequest.priority == ServiceRequestPriority.EXPRESS).desc(),
            ServiceRequest.created_at.desc(),
        )
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
    if request.client_id != user.id:
        type_map = {
            ServiceRequestStatus.ACCEPTED: (
                NotificationType.REQUEST_ACCEPTED,
                "Demande acceptee",
                f"{user.full_name or user.email} a accepte votre demande pour « {request.service.name} ».",
            ),
            ServiceRequestStatus.DECLINED: (
                NotificationType.REQUEST_DECLINED,
                "Demande refusee",
                f"{user.full_name or user.email} a refuse votre demande pour « {request.service.name} ».",
            ),
            ServiceRequestStatus.IN_PROGRESS: (
                NotificationType.REQUEST_IN_PROGRESS,
                "Intervention demarree",
                f"{user.full_name or user.email} a demarre l'intervention « {request.service.name} ».",
            ),
            ServiceRequestStatus.COMPLETED: (
                NotificationType.REQUEST_COMPLETED,
                "Intervention terminee",
                f"{user.full_name or user.email} a termine l'intervention « {request.service.name} ».",
            ),
        }
        item = type_map.get(new_status)
        if item is not None:
            create_notification(
                db,
                request.client_id,
                item[0],
                title=item[1],
                message=item[2],
                data={"request_id": request.id, "service_id": request.service_id},
            )
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