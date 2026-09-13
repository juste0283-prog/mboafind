"""Routes publiques des produits (/api/v1/products)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_optional_user
from app.models.user import User
from app.schemas.product import ProductDetail, ProductPage
from app.services import catalog, nlp_search

router = APIRouter(prefix="/products", tags=["catalog"])


@router.get("/natural", summary="Recherche en langage naturel")
def natural_search(
    q: str = Query(..., min_length=1, description="Requete libre en francais"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    """Interprete une requete libre (ville, categorie, budget) puis recherche.

    Exemple : « ordinateur portable a Yaounde, moins de 200 000 francs ».
    Renvoie l'interpretation (pour affichage) et la page de produits.
    """
    return nlp_search.natural_search(db, q, page=page, page_size=page_size)


@router.get("", response_model=ProductPage, summary="Rechercher des produits")
def search_products(
    search: str | None = Query(default=None, description="Mot-cle (nom, marque, categorie)"),
    category_id: int | None = Query(default=None, description="Filtre categorie"),
    city: str | None = Query(default=None, description="Filtre ville de la boutique"),
    min_price: float | None = Query(default=None, ge=0, description="Prix minimum (XAF)"),
    max_price: float | None = Query(default=None, ge=0, description="Prix maximum (XAF)"),
    available: bool = Query(default=False, description="Seulement les produits disponibles"),
    min_rating: float | None = Query(default=None, ge=0, le=5, description="Note minimale"),
    sort: str = Query(
        default="relevance",
        pattern="^(relevance|recent|price_asc|price_desc|distance)$",
        description="Tri : pertinence, fraicheur, prix croissant/decroissant, distance",
    ),
    lat: float | None = Query(default=None, description="Latitude (tri a la distance)"),
    lng: float | None = Query(default=None, description="Longitude (tri a la distance)"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
) -> ProductPage:
    """Recherche produits avec filtres, tri (prix/fraicheur/distance) et pagination."""
    return catalog.search_products(
        db,
        search=search,
        category_id=category_id,
        city=city,
        min_price=min_price,
        max_price=max_price,
        available=available,
        min_rating=min_rating,
        sort=sort,
        lat=lat,
        lng=lng,
        page=page,
        page_size=page_size,
    )


@router.get("/{product_id}", response_model=ProductDetail, summary="Fiche produit")
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> ProductDetail:
    """Fiche produit detaillee avec la liste des offres (prix par boutique)."""
    return catalog.get_product(db, product_id, current_user=current_user)