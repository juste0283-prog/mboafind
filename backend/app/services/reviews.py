"""Service des avis et notations (section 6.6 Confiance et moderation).

Regles d'eligibilite du MVP :
- un avis par (auteur, cible) ;
- noter un professionnel exige une intervention terminee (demande COMPLETED) ;
- noter un commerce est ouvert a tout utilisateur connecte (une seule fois) ;
- publication immediate en MVP (la moderation admin viendra dans la phase admin).
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Professional, Review, Service, ServiceRequest, Store
from app.models.enums import ReviewModerationStatus, ServiceRequestStatus
from app.schemas.review import ReviewCreate, ReviewPage, ReviewRead


def _review_read(review: Review) -> ReviewRead:
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


def create_review(db: Session, author, payload: ReviewCreate) -> ReviewRead:
    """Le client laisse un avis (etoiles 1-5 + commentaire), une fois par cible."""
    store_id: int | None = payload.store_id
    professional_id: int | None = payload.professional_id

    if store_id is not None:
        store = db.get(Store, store_id)
        if store is None or not store.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
            )
        existing = (
            db.query(Review)
            .filter(Review.author_id == author.id, Review.store_id == store.id)
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vous avez deja evalue ce commerce",
            )
    else:
        professional = db.get(Professional, professional_id)
        if professional is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Professionnel introuvable"
            )
        existing = (
            db.query(Review)
            .filter(Review.author_id == author.id, Review.professional_id == professional.id)
            .first()
        )
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vous avez deja evalue ce professionnel",
            )
        # Eligibilite : au moins une demande terminee avec ce professionnel.
        completed = (
            db.query(ServiceRequest)
            .join(Service, ServiceRequest.service_id == Service.id)
            .filter(
                ServiceRequest.client_id == author.id,
                ServiceRequest.status == ServiceRequestStatus.COMPLETED,
                Service.professional_id == professional.id,
            )
            .first()
        )
        if completed is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Vous pouvez noter un professionnel uniquement apres "
                    "une intervention terminee."
                ),
            )

    review = Review(
        author_id=author.id,
        store_id=store_id,
        professional_id=professional_id,
        rating=payload.rating,
        comment=payload.comment,
        moderation_status=ReviewModerationStatus.APPROVED,  # MVP : publication immediat
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _review_read(review)


def list_reviews(
    db: Session,
    *,
    store_id: int | None = None,
    professional_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
) -> ReviewPage:
    """Avis publics (approuves uniquement) d'une boutique ou d'un professionnel."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = db.query(Review).filter(
        Review.moderation_status == ReviewModerationStatus.APPROVED
    )
    if store_id is not None:
        base = base.filter(Review.store_id == store_id)
    if professional_id is not None:
        base = base.filter(Review.professional_id == professional_id)
    total = base.count()
    reviews = (
        base.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return ReviewPage(
        items=[_review_read(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
    )


def list_my_reviews(
    db: Session, author, page: int = 1, page_size: int = 20
) -> ReviewPage:
    """Les avis deposes par l'utilisateur courant (tous statuts)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = (
        db.query(Review)
        .filter(Review.author_id == author.id)
        .order_by(Review.created_at.desc())
    )
    total = base.count()
    reviews = base.offset((page - 1) * page_size).limit(page_size).all()
    return ReviewPage(
        items=[_review_read(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
    )