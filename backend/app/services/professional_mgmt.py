"""Service de gestion du profil professionnel et de ses services."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Professional, Service, User
from app.schemas.professional import (
    ProfessionalCreate,
    ProfessionalUpdate,
    ServiceCreate,
    ServiceUpdate,
)
from app.utils.time import utcnow


def _get_professional(db: Session, user: User) -> Professional:
    """Recupere le profil professionnel de l'utilisateur."""
    if user.professional is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vous n'avez pas encore de profil professionnel",
        )
    return user.professional


def create_or_update_profile(
    db: Session, user: User, payload: ProfessionalCreate
) -> dict:
    """Cree ou met a jour le profil professionnel de l'utilisateur."""
    prof = user.professional
    if prof is None:
        prof = Professional(
            user_id=user.id,
            profession=payload.profession,
            bio=payload.bio,
            city=payload.city,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        db.add(prof)
    else:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(prof, field, value)
    db.commit()
    db.refresh(prof)
    return {
        "id": prof.id,
        "profession": prof.profession,
        "bio": prof.bio,
        "city": prof.city,
        "latitude": prof.latitude,
        "longitude": prof.longitude,
        "is_verified": prof.is_verified,
        "created_at": prof.created_at,
    }


def get_my_profile(db: Session, user: User) -> dict:
    """Retourne le profil professionnel de l'utilisateur connecte."""
    prof = _get_professional(db, user)
    services = (
        db.query(Service)
        .filter(Service.professional_id == prof.id)
        .order_by(Service.name)
        .all()
    )
    return {
        "id": prof.id,
        "profession": prof.profession,
        "bio": prof.bio,
        "city": prof.city,
        "latitude": prof.latitude,
        "longitude": prof.longitude,
        "is_verified": prof.is_verified,
        "created_at": prof.created_at,
        "services": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "price": float(s.price) if s.price is not None else None,
                "currency": s.currency,
                "is_active": s.is_active,
                "created_at": s.created_at,
            }
            for s in services
        ],
    }


# -------------------------------------------------------- services CRUD
def create_service(db: Session, user: User, payload: ServiceCreate) -> dict:
    """Ajoute un service a l'offre du professionnel."""
    prof = _get_professional(db, user)
    service = Service(
        professional_id=prof.id,
        name=payload.name,
        description=payload.description,
        price=payload.price,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return {
        "id": service.id,
        "name": service.name,
        "description": service.description,
        "price": float(service.price) if service.price is not None else None,
        "currency": service.currency,
        "is_active": service.is_active,
        "created_at": service.created_at,
    }


def update_service(db: Session, user: User, service_id: int, payload: ServiceUpdate) -> dict:
    """Met a jour un service du professionnel."""
    prof = _get_professional(db, user)
    service = db.get(Service, service_id)
    if service is None or service.professional_id != prof.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service introuvable",
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    db.add(service)
    db.commit()
    db.refresh(service)
    return {
        "id": service.id,
        "name": service.name,
        "description": service.description,
        "price": float(service.price) if service.price is not None else None,
        "currency": service.currency,
        "is_active": service.is_active,
        "created_at": service.created_at,
    }


def delete_service(db: Session, user: User, service_id: int) -> None:
    """Desactive un service du professionnel (soft delete)."""
    prof = _get_professional(db, user)
    service = db.get(Service, service_id)
    if service is None or service.professional_id != prof.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service introuvable",
        )
    service.is_active = False
    db.add(service)
    db.commit()
