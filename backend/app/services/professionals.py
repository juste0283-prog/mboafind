"""Service professionnels et services (Services Express, section 6.5).

- catalogue de services et profils professionnels ;
- recherche par mot cle, ville et note ;
- fiche professionnel : tarif indicatif, zone d'intervention, services.
"""

import math

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Professional, Review, Service, User
from app.models.enums import ReviewModerationStatus
from app.schemas.professional import (
    ProfessionalDetail,
    ProfessionalListItem,
    ProfessionalPage,
    ServiceRead,
)
from app.services.catalog import haversine_km
from app.utils.slug import normalize_text, split_terms

_APPROVED = [ReviewModerationStatus.APPROVED]


def _rating(db: Session, professional_id: int) -> tuple[float | None, int]:
    avg, count = (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(
            Review.professional_id == professional_id,
            Review.moderation_status.in_(_APPROVED),
        )
        .one()
    )
    return (round(float(avg), 2) if avg is not None else None), int(count)


def _professional_matches_terms(pro: Professional, terms: list[str]) -> bool:
    """Vérifie qu'un professionnel répond à tous les termes normalisés."""
    if not terms:
        return True
    haystack = " ".join(
        [
            normalize_text(pro.profession or ""),
            normalize_text(pro.bio or ""),
            normalize_text(pro.user.full_name or ""),
            normalize_text(pro.user.email or ""),
        ]
    )
    # Services du professionnel
    for svc in pro.services:
        haystack += " " + normalize_text(svc.name or "")
    return all(term in haystack for term in terms)


def _services_count(db: Session, professional_id: int) -> int:
    return (
        db.query(func.count(Service.id))
        .filter(Service.professional_id == professional_id, Service.is_active.is_(True))
        .scalar()
        or 0
    )


def _active_services(db: Session, professional_id: int) -> list[ServiceRead]:
    services = (
        db.query(Service)
        .filter(Service.professional_id == professional_id, Service.is_active.is_(True))
        .order_by(Service.created_at.desc())
        .all()
    )
    return [
        ServiceRead(
            id=s.id,
            professional_id=s.professional_id,
            name=s.name,
            description=s.description,
            price=float(s.price) if s.price is not None else None,
            currency=s.currency,
            is_active=s.is_active,
            created_at=s.created_at,
        )
        for s in services
    ]
def search_professionals(
    db: Session,
    *,
    search: str | None = None,
    city: str | None = None,
    min_rating: float | None = None,
    sort: str = "relevance",
    lat: float | None = None,
    lng: float | None = None,
    page: int = 1,
    page_size: int = 20,
) -> ProfessionalPage:
    """Recherche de professionnels (profession, nom, service, ville)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)

    q = (
        db.query(Professional)
        .join(User, Professional.user_id == User.id)
        .outerjoin(Service, Service.professional_id == Professional.id)
    )
    if city:
        q = q.filter(Professional.city.ilike(f"%{city.strip()}%"))
    q = q.distinct()

    professionals = q.order_by(Professional.created_at.desc()).all()

    # Filtre texte en Python (accent-tolerant, comme le catalogue).
    if search:
        terms = split_terms(search)
        if terms:
            professionals = [
                p for p in professionals
                if _professional_matches_terms(p, terms)
            ]

    items: list[ProfessionalListItem] = []
    for pro in professionals:
        avg, count = _rating(db, pro.id)
        if min_rating is not None and (avg or 0) < min_rating:
            continue
        items.append(
            ProfessionalListItem(
                id=pro.id,
                profession=pro.profession,
                bio=pro.bio,
                city=pro.city,
                latitude=pro.latitude,
                longitude=pro.longitude,
                is_verified=pro.is_verified,
                user_name=pro.user.full_name or pro.user.email,
                rating_avg=avg,
                rating_count=count,
                services_count=_services_count(db, pro.id),
            )
        )

    if sort == "rating":
        items.sort(key=lambda p: p.rating_avg or 0, reverse=True)
    elif sort == "distance" and lat is not None and lng is not None:
        def _dist(p: ProfessionalListItem) -> float:
            if p.latitude is None or p.longitude is None:
                return math.inf
            return haversine_km(lat, lng, p.latitude, p.longitude)
        items.sort(key=_dist)
    elif sort in ("price_asc", "price_desc"):
        # Tri par prix du service le moins cher propose par le professionnel.
        def _cheapest(pro_id: int):
            return (
                db.query(func.min(Service.price))
                .filter(Service.professional_id == pro_id, Service.is_active.is_(True))
                .scalar()
                or math.inf
            )
        items.sort(key=lambda p: _cheapest(p.id), reverse=(sort == "price_desc"))
    else:
        # Pertinence : nom du professionnel commençant par la recherche d'abord.
        term = (search or "").strip().lower()
        if term:
            items.sort(
                key=lambda p: (p.user_name or "").lower().startswith(term),
                reverse=True,
            )

    total = len(items)
    start = (page - 1) * page_size
    return ProfessionalPage(
        items=items[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_professional(db: Session, professional_id: int) -> ProfessionalDetail:
    """Fiche professionnel detaillee : profil, services, avis."""
    pro = db.get(Professional, professional_id)
    if pro is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Professionnel introuvable"
        )
    avg, count = _rating(db, pro.id)
    reviews = (
        db.query(Review)
        .filter(
            Review.professional_id == pro.id,
            Review.moderation_status.in_(_APPROVED),
        )
        .order_by(Review.created_at.desc())
        .limit(50)
        .all()
    )

    return ProfessionalDetail(
        id=pro.id,
        profession=pro.profession,
        bio=pro.bio,
        city=pro.city,
        latitude=pro.latitude,
        longitude=pro.longitude,
        is_verified=pro.is_verified,
        user_name=pro.user.full_name or pro.user.email,
        phone=pro.user.phone,
        rating_avg=avg,
        rating_count=count,
        services=_active_services(db, pro.id),
        reviews=[
            {
                "id": r.id,
                "author_id": r.author_id,
                "author_name": (r.author.full_name or r.author.email)
                if r.author
                else None,
                "store_id": r.store_id,
                "professional_id": r.professional_id,
                "rating": r.rating,
                "comment": r.comment,
                "moderation_status": r.moderation_status,
                "created_at": r.created_at,
            }
            for r in reviews
        ],
    )