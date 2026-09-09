"""Routes publiques des professionnels (/api/v1/professionals)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from app.schemas.professional import ProfessionalDetail, ProfessionalPage
from app.services import professionals

router = APIRouter(prefix="/professionals", tags=["professionals"])


@router.get("", response_model=ProfessionalPage, summary="Rechercher des professionnels")
def search_professionals(
    search: str | None = Query(default=None, description="Mot-cle (metier, service, nom)"),
    city: str | None = Query(default=None, description="Filtre ville (zone d'intervention)"),
    min_rating: float | None = Query(default=None, ge=0, le=5, description="Note minimale"),
    sort: str = Query(
        default="relevance",
        pattern="^(relevance|rating|price_asc|price_desc|distance)$",
        description="Tri : pertinence, note, prix, distance",
    ),
    lat: float | None = Query(default=None, description="Latitude (tri a la distance)"),
    lng: float | None = Query(default=None, description="Longitude (tri a la distance)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> ProfessionalPage:
    """Recherche de professionnels : metier, service, ville, note, distance."""
    return professionals.search_professionals(
        db,
        search=search,
        city=city,
        min_rating=min_rating,
        sort=sort,
        lat=lat,
        lng=lng,
        page=page,
        page_size=page_size,
    )


@router.get("/{professional_id}", response_model=ProfessionalDetail, summary="Fiche professionnel")
def get_professional(
    professional_id: int, db: Session = Depends(get_db)
) -> ProfessionalDetail:
    """Fiche professionnel : profil, services et avis."""
    return professionals.get_professional(db, professional_id)