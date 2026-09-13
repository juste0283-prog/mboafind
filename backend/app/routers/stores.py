"""Routes des boutiques (/api/v1/stores) et confirmation de prix."""

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db, require_roles
from app.models.enums import UserRole
from app.schemas.price import (
    PriceConfirmRead,
    PriceCreate,
    PriceHistoryRead,
    PriceManageRead,
    PriceUpdate,
)
from app.schemas.product import (
    ProductAdminRead,
    ProductCreate,
    ProductImageRead,
    ProductUpdate,
)
from app.schemas.store import StoreCreate, StoreDetail, StoreRead, StoreUpdate
from app.services import catalog

stores_router = APIRouter(prefix="/stores", tags=["catalog"])
prices_router = APIRouter(prefix="/prices", tags=["catalog"])


# --------------------------------------------------------- lecture publique
@stores_router.get("/{store_id}", response_model=StoreDetail, summary="Fiche boutique")
def get_store(store_id: int, db: Session = Depends(get_db)) -> StoreDetail:
    """Fiche boutique : localisation, produits vendus et avis."""
    return catalog.get_store(db, store_id)


# ----------------------------------------------------------- CRUD commerant
@stores_router.post(
    "",
    response_model=StoreRead,
    status_code=201,
    summary="Creer une boutique",
)
def create_store(
    payload: StoreCreate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> StoreRead:
    """Un commerçant cree sa boutique."""
    return catalog.create_store(db, current_user, payload)


@stores_router.get(
    "",
    response_model=list[StoreRead],
    summary="Mes boutiques",
)
def list_my_stores(
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> list[StoreRead]:
    """Liste les boutiques du commerçant connecte."""
    return catalog.list_my_stores(db, current_user)


@stores_router.patch(
    "/{store_id}",
    response_model=StoreRead,
    summary="Modifier ma boutique",
)
def update_store(
    store_id: int,
    payload: StoreUpdate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> StoreRead:
    """Met a jour les informations d'une boutique."""
    return catalog.update_store(db, current_user, store_id, payload)


@stores_router.delete(
    "/{store_id}",
    status_code=204,
    summary="Supprimer ma boutique",
)
def delete_store(
    store_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> None:
    """Desactive une boutique (proprietaire uniquement)."""
    catalog.delete_store(db, current_user, store_id)


# ------------------------------------------------ CRUD produits par boutique
@stores_router.post(
    "/{store_id}/products",
    response_model=ProductAdminRead,
    status_code=201,
    summary="Ajouter un produit a ma boutique",
)
def create_product(
    store_id: int,
    payload: ProductCreate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> ProductAdminRead:
    """Ajoute un produit au catalogue de la boutique."""
    return catalog.create_product(db, current_user, store_id, payload)


@stores_router.get(
    "/{store_id}/products",
    response_model=list[ProductAdminRead],
    summary="Mes produits dans cette boutique",
)
def list_my_store_products(
    store_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> list[ProductAdminRead]:
    """Liste les produits d'une boutique du commerçant."""
    return catalog.list_my_products(db, current_user, store_id)


@stores_router.post(
    "/{store_id}/prices",
    response_model=PriceManageRead,
    status_code=201,
    summary="Ajouter/met a jour un prix",
)
def create_or_update_price(
    store_id: int,
    product_id: int,
    payload: PriceCreate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> PriceManageRead:
    """Ajoute ou met a jour l'offre de prix d'un produit dans la boutique."""
    return catalog.create_price(db, current_user, store_id, product_id, payload)


@stores_router.get(
    "/{store_id}/prices",
    response_model=list[PriceManageRead],
    summary="Mes prix dans cette boutique",
)
def list_my_store_prices(
    store_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> list[PriceManageRead]:
    """Liste les offres de prix d'une boutique."""
    return catalog.list_my_prices(db, current_user, store_id)


# ------------------------------------------------- CRUD produit global
@stores_router.patch(
    "/products/{product_id}",
    response_model=ProductAdminRead,
    summary="Modifier un produit",
)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> ProductAdminRead:
    """Met a jour les informations d'un produit."""
    return catalog.update_product(db, current_user, product_id, payload)


@stores_router.delete(
    "/products/{product_id}",
    status_code=204,
    summary="Supprimer un produit",
)
def delete_product(
    product_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> None:
    """Desactive un produit (soft delete)."""
    catalog.delete_product(db, current_user, product_id)


# ------------------------------------------------ images d'un produit
@stores_router.get(
    "/products/{product_id}/images",
    response_model=list[ProductImageRead],
    summary="Lister les images d'un produit",
)
def list_product_images(
    product_id: int,
    db: Session = Depends(get_db),
) -> list[ProductImageRead]:
    """Liste les images d'un produit (publique)."""
    return catalog.list_product_images(db, product_id)


@stores_router.post(
    "/products/{product_id}/images",
    response_model=ProductImageRead,
    status_code=201,
    summary="Ajouter une image a un produit",
)
def add_product_image(
    product_id: int,
    file: UploadFile = File(...),
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> ProductImageRead:
    """Ajoute une image a un produit du commerçant. La premiere image devient principale."""
    return catalog.add_product_image(db, current_user, product_id, file)


@stores_router.post(
    "/products/{product_id}/images/{image_id}/primary",
    response_model=ProductImageRead,
    summary="Definir l'image principale",
)
def set_primary_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> ProductImageRead:
    """Passe une image en principale (proprietaire uniquement)."""
    return catalog.set_primary_product_image(db, current_user, product_id, image_id)


@stores_router.delete(
    "/products/{product_id}/images/{image_id}",
    status_code=204,
    summary="Supprimer une image",
)
def delete_product_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> None:
    """Supprime une image et son fichier associe."""
    catalog.delete_product_image(db, current_user, product_id, image_id)


# --------------------------------------------------- modification prix
@prices_router.patch(
    "/{price_id}",
    response_model=PriceManageRead,
    summary="Modifier un prix",
)
def update_price(
    price_id: int,
    payload: PriceUpdate,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> PriceManageRead:
    """Met a jour une offre de prix (proprietaire de la boutique)."""
    return catalog.update_price(db, current_user, price_id, payload)


@prices_router.delete(
    "/{price_id}",
    status_code=204,
    summary="Supprimer un prix",
)
def delete_price(
    price_id: int,
    current_user=Depends(require_roles(UserRole.COMMERCANT)),
    db: Session = Depends(get_db),
) -> None:
    """Supprime une offre de prix."""
    catalog.delete_price(db, current_user, price_id)


# ----------------------------------------------- confirmation client
@prices_router.post(
    "/{price_id}/confirm",
    response_model=PriceConfirmRead,
    summary="Confirmer un prix observe",
)
def confirm_price(
    price_id: int,
    current_user=Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> PriceConfirmRead:
    """Un client connecte confirme qu'un prix est exact (fraicheur de l'info).

    Un client ne peut confirmer un prix qu'une seule fois : une seconde
    tentative renvoie already_confirmed=True sans recompter.
    """
    return catalog.confirm_price(db, current_user, price_id)


# ------------------------------------------------ historique prix
@prices_router.get(
    "/{price_id}/history",
    response_model=list[PriceHistoryRead],
    summary="Historique d'une offre de prix",
)
def get_price_history(
    price_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[PriceHistoryRead]:
    """Anciennes valeurs d'une offre de prix (ordre chronologique inverse)."""
    return catalog.get_price_history(db, price_id, limit=limit)