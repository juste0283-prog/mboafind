"""Service catalogue : recherche de produits, fiches, boutiques et prix.

Concentre les regles metier des sections 6.2 (recherche), 6.3 (prix reel)
et 6.4 (ou trouver) du cahier des charges :
- recherche insensible a la casse et tolerante aux espaces ;
- filtres par prix, disponibilite, ville, categorie et note ;
- tri par prix croissant, fraicheur (donnees recentes) ou distance ;
- fourchette de prix min/max/moyen ;
- confirmation d'un prix par un client.
"""

import math
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.models import Category, Price, Product, Review, Store
from app.models.enums import (
    CategoryType,
    NotificationType,
    PriceVerificationStatus,
    ReportStatus,
    ReportTargetType,
    ReviewModerationStatus,
)
from app.models.price_confirmation import PriceConfirmation
from app.models.price_history import PriceHistory
from app.models.product_image import ProductImage
from app.schemas.category import CategoryRead, CategorySummary
from app.schemas.marketplace import (
    CategoryCount,
    MarketplaceItem,
    MarketplacePage,
)
from app.schemas.price import (
    PriceConfirmRead,
    PriceHistoryRead,
    PriceManageRead,
    PriceRead,
)
from app.schemas.price_update import PriceUpdatePage, PriceUpdateRead
from app.schemas.product import (
    ProductAdminRead,
    ProductCreate,
    ProductDetail,
    ProductImageRead,
    ProductListItem,
    ProductPage,
    ProductUpdate,
)
from app.schemas.store import StoreCreate, StoreDetail, StoreRead, StoreUpdate
from app.services import notifications, price_alerts
from app.services.geocode import geocode_address, geocode_enabled
from app.services.images import delete_image_file, save_image_upload
from app.services.notifications import create_notification
from app.services.trust import compute_trust_score
from app.utils.slug import slugify, normalize_text, split_terms
from app.utils.time import utcnow

_APPROVED = [ReviewModerationStatus.APPROVED]


# ---------------------------------------------------------------- helpers
def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Distance approximative en kilometres (formule de haversine)."""
    radius = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(a))


def _matches_prices_query(
    db: Session,
    *,
    category_id: int | None = None,
    city: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    available: bool | None = None,
):
    """Requete (Price, Store, Product) restreinte aux offres correspondantes.

    Le filtre texte est applique en Python (voir split_terms) pour etre
    tolerant aux accents et a la casse quelle que soit la base de donnees.
    """
    q = (
        db.query(Price, Store, Product)
        .join(Store, Price.store_id == Store.id)
        .join(Product, Price.product_id == Product.id)
        .join(Category, Product.category_id == Category.id, isouter=True)
    )
    if category_id is not None:
        q = q.filter(Product.category_id == category_id)
    if city:
        q = q.filter(Store.city.ilike(f"%{city.strip()}%"))
    if min_price is not None:
        q = q.filter(Price.amount >= min_price)
    if max_price is not None:
        q = q.filter(Price.amount <= max_price)
    if available:
        q = q.filter(Price.is_available.is_(True))
    return q


def _product_matches_terms(product: Product, terms: list[str]) -> bool:
    """Verifie qu'un produit repond a tous les termes normalises du client."""
    if not terms:
        return True
    category = product.category
    haystack = " ".join(
        [
            normalize_text(product.name or ""),
            normalize_text(product.brand or ""),
            normalize_text(product.description or ""),
            normalize_text(category.name) if category else "",
        ]
    )
    return all(term in haystack for term in terms)


def _aggregate_offers(
    rows: list[tuple[Price, Store, Product]],
) -> dict[int, dict[str, Any]]:
    """Calcule les statistiques de prix par produit a partir des offres."""
    stats: dict[int, dict[str, Any]] = {}
    for price, store, product in rows:
        pid = price.product_id
        item = stats.setdefault(
            pid,
            {
                "min_price": None,
                "max_price": None,
                "total": 0.0,
                "count": 0,
                "store_ids": set(),
                "available": False,
                "updated_at": None,
            },
        )
        amount = float(price.amount)
        if item["min_price"] is None or amount < item["min_price"]:
            item["min_price"] = amount
        if item["max_price"] is None or amount > item["max_price"]:
            item["max_price"] = amount
        item["total"] += amount
        item["count"] += 1
        item["store_ids"].add(price.store_id)
        if price.is_available:
            item["available"] = True
        if item["updated_at"] is None or price.updated_at > item["updated_at"]:
            item["updated_at"] = price.updated_at
    return stats
def _category_summary(product: Product) -> CategorySummary | None:
    if product.category is None:
        return None
    return CategorySummary(
        id=product.category.id, name=product.category.name, slug=product.category.slug
    )


def _rating_agg(db: Session, *filters):
    """Moyenne et nombre d'avis approuves correspondant aux filtres."""
    return (
        db.query(func.avg(Review.rating), func.count(Review.id))
        .filter(Review.moderation_status.in_(_APPROVED), *filters)
        .one()
    )


def _rating_for_stores(db: Session, store_ids) -> tuple[float | None, int]:
    """Note moyenne et nombre d'avis des boutiques qui vendent les produits."""
    if not store_ids:
        return None, 0
    avg, count = _rating_agg(db, Review.store_id.in_(list(store_ids)))
    return (round(float(avg), 2) if avg is not None else None), int(count)


def _review_to_read(review: Review):
    """Serialise un avis avec le nom de son auteur."""
    author = review.author
    return {
        "id": review.id,
        "author_id": review.author_id,
        "author_name": (author.full_name or author.email) if author else None,
        "store_id": review.store_id,
        "professional_id": review.professional_id,
        "rating": review.rating,
        "comment": review.comment,
        "moderation_status": review.moderation_status,
        "created_at": review.created_at,
    }


def _price_to_read(
    price: Price,
    store: Store,
    *,
    db: Session,
    confirmed_by_me: bool = False,
    rating: tuple[float | None, int] | None = None,
) -> PriceRead:
    """Serialize une offre (prix + boutique) avec son score de confiance."""
    rating_avg, rating_count = rating if rating is not None else (None, 0)
    return PriceRead(
        id=price.id,
        store_id=store.id,
        store_name=store.name,
        store_city=store.city,
        store_is_verified=store.is_verified,
        store_latitude=store.latitude,
        store_longitude=store.longitude,
        store_rating_avg=rating_avg,
        store_rating_count=rating_count,
        amount=float(price.amount),
        currency=price.currency,
        is_available=price.is_available,
        verification_status=price.verification_status,
        updated_at=price.updated_at,
        confirmed_count=price.confirmed_count,
        last_confirmed_at=price.last_confirmed_at,
        trust_score=compute_trust_score(db, price, store),
        confirmed_by_me=confirmed_by_me,
    )


# --------------------------------------------------------------- categories
def list_categories(db: Session) -> list[CategoryRead]:
    """Toutes les categories publiques, triees par nom."""
    return db.query(Category).order_by(Category.name).all()
# ------------------------------------------------------------------ produit
def search_products(
    db: Session,
    *,
    search: str | None = None,
    category_id: int | None = None,
    city: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    available: bool | None = None,
    min_rating: float | None = None,
    sort: str = "relevance",
    lat: float | None = None,
    lng: float | None = None,
    page: int = 1,
    page_size: int = 20,
) -> ProductPage:
    """Recherche de produits avec filtres, tri et pagination (6.2 / 6.3)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)

    rows = _matches_prices_query(
        db,
        category_id=category_id,
        city=city,
        min_price=min_price,
        max_price=max_price,
        available=available,
    ).all()
    terms = split_terms(search) if search else []
    if terms:
        rows = [r for r in rows if _product_matches_terms(r[2], terms)]
    stats = _aggregate_offers(rows)
    if not stats:
        return ProductPage(items=[], total=0, page=page, page_size=page_size)

    products = {product.id: product for _, _, product in rows}
    items: list[ProductListItem] = []
    for pid, agg in stats.items():
        product = products[pid]
        avg, count = _rating_for_stores(db, agg["store_ids"])
        items.append(
            ProductListItem(
                id=product.id,
                name=product.name,
                slug=product.slug,
                brand=product.brand,
                image_url=product.image_url,
                category=_category_summary(product),
                min_price=agg["min_price"],
                max_price=agg["max_price"],
                avg_price=round(agg["total"] / agg["count"], 2),
                is_available=agg["available"],
                store_count=len(agg["store_ids"]),
                updated_at=agg["updated_at"],
                rating_avg=avg,
                rating_count=count,
            )
        )

    if sort == "price_asc":
        items.sort(key=lambda p: (p.min_price is None, p.min_price))
    elif sort == "price_desc":
        items.sort(key=lambda p: (p.max_price is None, -(p.max_price or 0)))
    elif sort == "distance" and lat is not None and lng is not None:
        items.sort(
            key=lambda p: _closest_store_distance(products[p.id], lat, lng)
        )
    elif sort == "recent":
        items.sort(
            key=lambda p: p.updated_at or datetime.min.replace(tzinfo=None),
            reverse=True,
        )
    else:
        # Pertinence : produits dont le nom commence par la recherche, sinon
        # priorite a la fraicheur (donnees recemment mises a jour).
        term = (search or "").strip().lower()
        if term:
            items.sort(key=lambda p: (not p.name.lower().startswith(term),))
        items.sort(key=lambda p: p.updated_at or datetime.min.replace(tzinfo=None), reverse=True)

    if min_rating is not None:
        items = [p for p in items if (p.rating_avg or 0) >= min_rating]

    total = len(items)
    start = (page - 1) * page_size
    return ProductPage(
        items=items[start : start + page_size], total=total, page=page, page_size=page_size
    )


# ------------------------------------------------------- vitrine Marketplace
def _offer_rows_for_marketplace(db, *, category_id: int | None = None) -> list:
    """Rows (Price, Store, Product) de la vitrine : offres actives uniquement."""
    q = (
        db.query(Price, Store, Product)
        .join(Store, Price.store_id == Store.id)
        .join(Product, Price.product_id == Product.id)
        .join(Category, Product.category_id == Category.id, isouter=True)
        .filter(
            Price.is_available.is_(True),
            Product.is_active.is_(True),
            Store.is_active.is_(True),
        )
    )
    if category_id is not None:
        q = q.filter(Product.category_id == category_id)
    return q.all()


def _category_counts_for_marketplace(db: Session) -> list[CategoryCount]:
    """Categories de produits avec au moins une offre active + compteurs."""
    rows = (
        db.query(
            Category.id,
            Category.name,
            Category.slug,
            func.count(func.distinct(Product.id)),
        )
        .join(Product, Product.category_id == Category.id)
        .join(Price, Price.product_id == Product.id)
        .join(Store, Price.store_id == Store.id)
        .filter(
            Price.is_available.is_(True),
            Product.is_active.is_(True),
            Store.is_active.is_(True),
            Category.type == CategoryType.PRODUCT,
        )
        .group_by(Category.id, Category.name, Category.slug)
        .order_by(func.count(func.distinct(Product.id)).desc())
        .all()
    )
    return [
        CategoryCount(id=cid, name=name, slug=slug, count=count)
        for cid, name, slug, count in rows
    ]


def _product_drop_percent(db: Session, product_id: int) -> float | None:
    """Plus grande baisse (%) observee sur les offres actuelles du produit.

    Compare le prix courant de chaque offre avec l'avant-derniere valeur
    connue (dernier enregistrement de l'historique de prix).
    """
    prices = (
        db.query(Price)
        .filter(Price.product_id == product_id, Price.is_available.is_(True))
        .all()
    )
    best: float | None = None
    for price in prices:
        last = (
            db.query(PriceHistory)
            .filter(PriceHistory.price_id == price.id)
            .order_by(PriceHistory.changed_at.desc(), PriceHistory.id.desc())
            .first()
        )
        if last is None:
            continue
        current = float(price.amount)
        previous = float(last.amount)
        if previous > current:
            drop = (previous - current) / previous * 100
            if best is None or drop > best:
                best = drop
    return round(best, 1) if best is not None else None


def marketplace(
    db: Session,
    *,
    category_id: int | None = None,
    sort: str = "price_asc",
    page: int = 1,
    page_size: int = 20,
) -> MarketplacePage:
    """Vitrine multi-boutiques : categories + produits (toutes offres confondues).

    Tri : price_asc (defaut), price_desc, recent, deals (plus grosses baisses
    de prix d'abord, produits sans baisse en fin de liste).
    """
    page = max(1, page)
    page_size = min(max(1, page_size), 50)

    categories = _category_counts_for_marketplace(db)
    rows = _offer_rows_for_marketplace(db, category_id=category_id)
    stats = _aggregate_offers(rows)
    if not stats:
        return MarketplacePage(
            categories=categories, items=[], total=0, page=page, page_size=page_size
        )

    products = {product.id: product for _, _, product in rows}
    items: list[MarketplaceItem] = []
    for pid, agg in stats.items():
        product = products[pid]
        avg, count = _rating_for_stores(db, agg["store_ids"])
        items.append(
            MarketplaceItem(
                id=product.id,
                name=product.name,
                slug=product.slug,
                brand=product.brand,
                image_url=product.image_url,
                category=_category_summary(product),
                min_price=agg["min_price"],
                max_price=agg["max_price"],
                avg_price=round(agg["total"] / agg["count"], 2),
                store_count=len(agg["store_ids"]),
                is_available=agg["available"],
                updated_at=agg["updated_at"],
                rating_avg=avg,
                rating_count=count,
            )
        )

    if sort == "price_asc":
        items.sort(key=lambda p: (p.min_price is None, p.min_price))
    elif sort == "price_desc":
        items.sort(key=lambda p: (p.max_price is None, -(p.max_price or 0)))
    elif sort == "recent":
        items.sort(key=lambda p: p.updated_at, reverse=True)
    elif sort == "deals":
        for item in items:
            item.deal_drop_percent = _product_drop_percent(db, item.id)
        items.sort(
            key=lambda p: (p.deal_drop_percent is None, -(p.deal_drop_percent or 0))
        )

    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    # Pour un tri non-deals, on calcule la baisse seulement pour la page affichee.
    if sort != "deals":
        for item in page_items:
            item.deal_drop_percent = _product_drop_percent(db, item.id)
    return MarketplacePage(
        categories=categories,
        items=page_items,
        total=total,
        page=page,
        page_size=page_size,
    )


def _closest_store_distance(product: Product, lat: float, lng: float) -> float:
    """Distance minimale (km) entre un point et les boutiques du produit."""
    distances = [
        haversine_km(lat, lng, store.latitude, store.longitude)
        for store in product.stores
        if store.latitude is not None and store.longitude is not None
    ]
    return min(distances) if distances else math.inf


def get_product(
    db: Session,
    product_id: int,
    current_user=None,
) -> ProductDetail:
    """Fiche produit detaillee avec la liste complete des offres (6.3)."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )

    rows = (
        db.query(Price, Store, Product)
        .join(Store, Price.store_id == Store.id)
        .join(Product, Price.product_id == Product.id)
        .filter(Price.product_id == product_id)
        .all()
    )
    stats = _aggregate_offers(rows)
    agg = stats.get(product_id)
    store_ids = agg["store_ids"] if agg else set()
    avg, count = _rating_for_stores(db, store_ids)

    # Notes moyennes par boutique (pour le classement economique des offres).
    ratings: dict[int, tuple[float | None, int]] = {}
    if store_ids:
        rating_rows = (
            db.query(Review.store_id, func.avg(Review.rating), func.count(Review.id))
            .filter(
                Review.store_id.in_(list(store_ids)),
                Review.moderation_status.in_(_APPROVED),
            )
            .group_by(Review.store_id)
            .all()
        )
        ratings = {
            sid: (round(float(ra), 2) if ra is not None else None, int(rc))
            for sid, ra, rc in rating_rows
        }

    # Offres confirmees par l'utilisateur courant (une confirmation max par prix).
    confirmed_ids: set[int] = set()
    if current_user is not None and rows:
        confirmed_ids = {
            c.price_id
            for c in db.query(PriceConfirmation.price_id)
            .filter(
                PriceConfirmation.user_id == current_user.id,
                PriceConfirmation.price_id.in_([p.id for p, _, _ in rows]),
            )
            .all()
        }

    offers = [
        _price_to_read(
            price,
            store,
            db=db,
            confirmed_by_me=price.id in confirmed_ids,
            rating=ratings.get(store.id),
        )
        for price, store, _ in rows
    ]
    # Offres disponibles d'abord, puis par prix croissant.
    offers.sort(key=lambda o: (not o.is_available, o.amount))

    images = [
        ProductImageRead.model_validate(img)
        for img in (
            db.query(ProductImage)
            .filter(ProductImage.product_id == product_id)
            .order_by(ProductImage.position)
            .all()
        )
    ]

    return ProductDetail(
        id=product.id,
        name=product.name,
        slug=product.slug,
        brand=product.brand,
        description=product.description,
        image_url=product.image_url,
        category=_category_summary(product),
        min_price=agg["min_price"] if agg else None,
        max_price=agg["max_price"] if agg else None,
        avg_price=round(agg["total"] / agg["count"], 2) if agg and agg["count"] else None,
        store_count=len(store_ids),
        is_available=bool(agg and agg["available"]),
        updated_at=agg["updated_at"] if agg else None,
        rating_avg=avg,
        rating_count=count,
        offers=offers,
        images=images,
    )


def confirm_price(db: Session, user, price_id: int) -> PriceConfirmRead:
    """Un client confirme qu'un prix observe est exact (6.3, workflow prix).

    Un client ne peut confirmer un prix qu'une seule fois : une seconde
    tentative est idempotente (aucun double comptage, flag already_confirmed).
    """
    price = db.get(Price, price_id)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Offre de prix introuvable"
        )

    existing = (
        db.query(PriceConfirmation)
        .filter(
            PriceConfirmation.price_id == price_id,
            PriceConfirmation.user_id == user.id,
        )
        .first()
    )
    if existing is not None:
        return PriceConfirmRead(
            price_id=price.id,
            confirmed_count=price.confirmed_count,
            last_confirmed_at=price.last_confirmed_at,
            message="Vous avez deja confirme ce prix.",
            already_confirmed=True,
        )

    confirmation = PriceConfirmation(price_id=price.id, user_id=user.id)
    db.add(confirmation)
    price.confirmed_count += 1
    price.last_confirmed_at = utcnow()
    if price.verification_status == PriceVerificationStatus.PENDING:
        price.verification_status = PriceVerificationStatus.VERIFIED
    db.add(price)
    store = db.get(Store, price.store_id)
    if store and store.owner_id != user.id:
        product = db.get(Product, price.product_id)
        create_notification(
            db,
            store.owner_id,
            NotificationType.PRICE_CONFIRMED,
            title="Prix confirme",
            message=(
                f"Un client a confirme votre prix de {float(price.amount):,.0f} FCFA "
                f"pour {product.name if product else 'un produit'}."
            ),
            data={"price_id": price.id, "product_id": price.product_id, "store_id": store.id},
        )
    db.commit()
    db.refresh(price)
    return PriceConfirmRead(
        price_id=price.id,
        confirmed_count=price.confirmed_count,
        last_confirmed_at=price.last_confirmed_at,
    )


def get_price_history(db: Session, price_id: int, limit: int = 50) -> list[PriceHistoryRead]:
    """Anciennes valeurs d'une offre de prix (ordre chronologique inverse)."""
    price = db.get(Price, price_id)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Offre de prix introuvable"
        )
    history = (
        db.query(PriceHistory)
        .filter(PriceHistory.price_id == price_id)
        .order_by(PriceHistory.changed_at.desc(), PriceHistory.id.desc())
        .limit(min(max(1, limit), 100))
        .all()
    )
    return [
        PriceHistoryRead(
            id=h.id,
            amount=float(h.amount),
            currency=h.currency,
            is_available=h.is_available,
            changed_at=h.changed_at,
        )
        for h in history
    ]


def list_price_updates(
    db: Session, page: int = 1, page_size: int = 20
) -> PriceUpdatePage:
    """Flux temps reel des changements de prix (historique des prix publics).

    Chaque entree correspond a une valeur enregistree d'une offre, avec la
    boutique et le produit, et la baisse relative par rapport a la valeur
    precedente de la meme offre le cas echeant.
    """
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    base = (
        db.query(PriceHistory, Price, Product, Store)
        .join(Price, PriceHistory.price_id == Price.id)
        .join(Product, Price.product_id == Product.id)
        .join(Store, Price.store_id == Store.id)
    )
    total = base.count()
    rows = (
        base.order_by(PriceHistory.changed_at.desc(), PriceHistory.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items: list[PriceUpdateRead] = []
    for history, price, product, store in rows:
        previous = (
            db.query(PriceHistory.amount)
            .filter(
                PriceHistory.price_id == price.id,
                PriceHistory.id != history.id,
            )
            .order_by(PriceHistory.changed_at.desc(), PriceHistory.id.desc())
            .first()
        )
        prev_amount = float(previous[0]) if previous else None
        current = float(history.amount)
        if prev_amount and prev_amount > current and prev_amount > 0:
            drop = round((prev_amount - current) / prev_amount * 100, 1)
        else:
            drop = 0.0
        items.append(
            PriceUpdateRead(
                id=history.id,
                product_id=product.id,
                product_name=product.name,
                image_url=product.image_url,
                store_id=store.id,
                store_name=store.name,
                store_city=store.city,
                amount=current,
                currency=history.currency,
                is_available=history.is_available,
                changed_at=history.changed_at,
                previous_amount=prev_amount,
                drop_percent=drop,
            )
        )
    return PriceUpdatePage(
        items=items, total=total, page=page, page_size=page_size
    )


# ----------------------------------------------------------------- boutique
def get_store(db: Session, store_id: int) -> StoreDetail:
    """Fiche boutique : infos, produits vendus et avis publics (6.4)."""
    store = db.get(Store, store_id)
    if store is None or not store.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
        )

    avg, count = _rating_agg(db, Review.store_id == store.id)
    reviews = (
        db.query(Review)
        .filter(Review.store_id == store.id, Review.moderation_status.in_(_APPROVED))
        .order_by(Review.created_at.desc())
        .limit(50)
        .all()
    )

    return StoreDetail(
        id=store.id,
        name=store.name,
        description=store.description,
        phone=store.phone,
        email=store.email,
        address=store.address,
        city=store.city,
        latitude=store.latitude,
        longitude=store.longitude,
        opening_hours=store.opening_hours,
        is_verified=store.is_verified,
        owner_id=store.owner_id,
        rating_avg=round(float(avg), 2) if avg is not None else None,
        rating_count=int(count),
        products=_store_products(db, store.id),
        reviews=[_review_to_read(r) for r in reviews],
    )


def _store_products(db: Session, store_id: int) -> list[ProductListItem]:
    """Produits vendus par une boutique (avec statistiques de prix)."""
    rows = (
        db.query(Price, Store, Product)
        .join(Store, Price.store_id == Store.id)
        .join(Product, Price.product_id == Product.id)
        .filter(Price.store_id == store_id)
        .all()
    )
    stats = _aggregate_offers(rows)
    products = {product.id: product for _, _, product in rows}
    items: list[ProductListItem] = []
    for pid, agg in stats.items():
        product = products[pid]
        avg, count = _rating_for_stores(db, agg["store_ids"])
        items.append(
            ProductListItem(
                id=product.id,
                name=product.name,
                slug=product.slug,
                brand=product.brand,
                image_url=product.image_url,
                category=_category_summary(product),
                min_price=agg["min_price"],
                max_price=agg["max_price"],
                avg_price=round(agg["total"] / agg["count"], 2),
                is_available=agg["available"],
                store_count=len(agg["store_ids"]),
                updated_at=agg["updated_at"],
                rating_avg=avg,
                rating_count=count,
            )
        )
    items.sort(key=lambda p: p.avg_price if p.avg_price is not None else 0)
    return items


# --------------------------------------------------- CRUD boutique (commercant)
def _geocode_store_fallback(store: Store, force: bool = False) -> None:
    """Positionne latitude/longitude depuis la ville/adresse si absentes.

    Best-effort : si le geocodage est desactive ou echoue, les coordonnees
    restent vides et le commercant est averti cote client. `force=True`
    relance le geocodage meme si des coordonnees existent (adresse changee).
    """
    if store.latitude is not None and store.longitude is not None and not force:
        return
    if not geocode_enabled():
        return
    result = geocode_address(store.city, store.address)
    if result is None:
        return
    store.latitude, store.longitude = result


def _ensure_store_owner(store: Store, user) -> None:
    """Verifie que l'utilisateur est le proprietaire de la boutique."""
    if store.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous n'etes pas le proprietaire de cette boutique",
        )


def create_store(db: Session, user, payload: StoreCreate) -> StoreRead:
    """Cree une boutique pour un commerçant."""
    store = Store(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        city=payload.city,
        province=payload.province,
        latitude=payload.latitude,
        longitude=payload.longitude,
        opening_hours=payload.opening_hours,
    )
    _geocode_store_fallback(store)
    db.add(store)
    db.commit()
    db.refresh(store)
    return StoreRead.model_validate(store)


def _store_ratings(db: Session, store_ids) -> dict[int, tuple[float | None, int]]:
    """Note moyenne et nombre d'avis approuves, par boutique."""
    if not store_ids:
        return {}
    rows = (
        db.query(Review.store_id, func.avg(Review.rating), func.count(Review.id))
        .filter(
            Review.store_id.in_(list(store_ids)),
            Review.moderation_status.in_(_APPROVED),
        )
        .group_by(Review.store_id)
        .all()
    )
    return {
        sid: (round(float(avg), 2) if avg is not None else None, int(count))
        for sid, avg, count in rows
    }


def list_public_stores(
    db: Session,
    *,
    city: str | None = None,
    lat: float | None = None,
    lng: float | None = None,
    sort: str = "recent",
) -> list[StoreRead]:
    """Annuaire public des boutiques actives, avec note moyenne.

    Tri possible : "recent" (creees recemment), "name" (alphabetique),
    ou "distance" (proximite haversine, requiert lat/lng ; les boutiques
    sans coordonnees sont rejetees en fin de liste).
    """
    q = db.query(Store).filter(Store.is_active.is_(True))
    if city and city.strip():
        q = q.filter(Store.city.ilike(f"%{city.strip()}%"))
    stores = q.all()
    ratings = _store_ratings(db, [s.id for s in stores])

    if sort == "distance" and lat is not None and lng is not None:
        stores.sort(
            key=lambda s: (
                haversine_km(lat, lng, s.latitude, s.longitude)
                if s.latitude is not None and s.longitude is not None
                else float("inf")
            )
        )
    elif sort == "name":
        stores.sort(key=lambda s: (s.name or "").lower())
    else:
        stores.sort(key=lambda s: s.created_at, reverse=True)

    return [
        StoreRead(
            id=s.id,
            name=s.name,
            description=s.description,
            phone=s.phone,
            email=s.email,
            address=s.address,
            city=s.city,
            province=s.province,
            latitude=s.latitude,
            longitude=s.longitude,
            opening_hours=s.opening_hours,
            is_verified=s.is_verified,
            is_active=s.is_active,
            owner_id=s.owner_id,
            rating_avg=ratings.get(s.id, (None, 0))[0],
            rating_count=ratings.get(s.id, (None, 0))[1],
        )
        for s in stores
    ]


def list_my_stores(db: Session, user) -> list[StoreRead]:
    """Liste les boutiques du commerçant connecte."""
    stores = (
        db.query(Store)
        .filter(Store.owner_id == user.id)
        .order_by(Store.created_at.desc())
        .all()
    )
    return [StoreRead.model_validate(s) for s in stores]


def update_store(db: Session, user, store_id: int, payload: StoreUpdate) -> StoreRead:
    """Met a jour une boutique (proprietaire uniquement)."""
    store = db.get(Store, store_id)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
        )
    _ensure_store_owner(store, user)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(store, field, value)
    # Si la ville/l'adresse change sans coordonnees fournies : on relance
    # le geocodage pour ne pas laisser une position obsolete.
    if ({"address", "city"} & set(data)) and not (
        {"latitude", "longitude"} & set(data)
    ):
        _geocode_store_fallback(store, force=True)
    else:
        _geocode_store_fallback(store)
    db.add(store)
    db.commit()
    db.refresh(store)
    return StoreRead.model_validate(store)


def delete_store(db: Session, user, store_id: int) -> None:
    """Desactive une boutique (soft delete, proprietaire uniquement)."""
    store = db.get(Store, store_id)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
        )
    _ensure_store_owner(store, user)
    store.is_active = False
    db.add(store)
    db.commit()


# --------------------------------------------------- CRUD produit (commercant)
def _ensure_store_owner_of_price(db: Session, store_id: int, user) -> Store:
    """Verifie qu'un prix appartient au commerçant via la boutique."""
    store = db.get(Store, store_id)
    if store is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
        )
    _ensure_store_owner(store, user)
    return store


def create_product(db: Session, user, store_id: int, payload: ProductCreate) -> ProductAdminRead:
    """Cree un produit dans une boutique du commerçant."""
    _ensure_store_owner_of_price(db, store_id, user)
    existing = db.query(Product).filter(Product.slug == slugify(payload.name)).first()
    if existing:
        product = existing
    else:
        product = Product(
            name=payload.name,
            slug=slugify(payload.name),
            description=payload.description,
            brand=payload.brand,
            image_url=payload.image_url,
            category_id=payload.category_id,
        )
        db.add(product)
        db.flush()
    store = db.get(Store, store_id)
    if product not in store.products:
        store.products.append(product)
    db.commit()
    db.refresh(product)
    return ProductAdminRead.model_validate(product)


def list_my_products(db: Session, user, store_id: int) -> list[ProductAdminRead]:
    """Liste les produits d'une boutique du commerçant."""
    _ensure_store_owner_of_price(db, store_id, user)
    products = (
        db.query(Product)
        .join(Price, Price.store_id == store_id)
        .filter(Price.store_id == store_id, Product.is_active.is_(True))
        .distinct()
        .order_by(Product.name)
        .all()
    )
    return [ProductAdminRead.model_validate(p) for p in products]


def update_product(db: Session, user, product_id: int, payload: ProductUpdate) -> ProductAdminRead:
    """Met a jour les informations d'un produit (proprietaire d'une boutique qui le vend)."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )
    # Verifier que l'utilisateur possede au moins une boutique qui vend ce produit
    store_ids = [p.id for p in db.query(Store).filter(Store.owner_id == user.id).all()]
    has_access = db.query(Price).filter(
        Price.product_id == product_id, Price.store_id.in_(store_ids)
    ).first()
    if has_access is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne vendez pas ce produit dans une de vos boutiques",
        )
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        data["slug"] = slugify(data["name"])
    for field, value in data.items():
        setattr(product, field, value)
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductAdminRead.model_validate(product)


def delete_product(db: Session, user, product_id: int) -> None:
    """Desactive un produit (soft delete)."""
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )
    store_ids = [p.id for p in db.query(Store).filter(Store.owner_id == user.id).all()]
    has_access = db.query(Price).filter(
        Price.product_id == product_id, Price.store_id.in_(store_ids)
    ).first()
    if has_access is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne vendez pas ce produit dans une de vos boutiques",
        )
    product.is_active = False
    db.add(product)
    db.commit()


# --------------------------------------------------- images des produits
def _ensure_product_seller(db: Session, user, product_id: int) -> Product:
    """Verifie que l'utilisateur vend ce produit et retourne le produit."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )
    store_ids = [p.id for p in db.query(Store).filter(Store.owner_id == user.id).all()]
    has_access = db.query(Price).filter(
        Price.product_id == product_id, Price.store_id.in_(store_ids)
    ).first()
    if has_access is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vous ne vendez pas ce produit dans une de vos boutiques",
        )
    return product


def list_product_images(db: Session, product_id: int) -> list[ProductImageRead]:
    """Liste les images d'un produit (publique, ordre de la galerie)."""
    return [
        ProductImageRead.model_validate(img)
        for img in (
            db.query(ProductImage)
            .filter(ProductImage.product_id == product_id)
            .order_by(ProductImage.position)
            .all()
        )
    ]


def add_product_image(
    db: Session, user, product_id: int, file
) -> ProductImageRead:
    """Enregistre une image pour un produit du commerçant.

    La premiere image devient automatiquement l'image principale. Une image
    ajoutee est placee en fin de galerie.
    """
    product = _ensure_product_seller(db, user, product_id)
    url = save_image_upload(file, product_id)
    existing = db.query(ProductImage).filter(ProductImage.product_id == product_id).all()
    next_position = max((img.position for img in existing), default=-1) + 1

    image = ProductImage(
        product_id=product_id,
        url=url,
        is_primary=not existing,
        position=next_position,
    )
    db.add(image)
    if not existing:
        product.image_url = url
        db.add(product)
    db.commit()
    db.refresh(image)

    record = db.get(ProductImage, image.id)
    return ProductImageRead.model_validate(record)


def _set_single_primary(db: Session, product_id: int, primary: ProductImage) -> None:
    """Une seule image principale par produit."""
    db.query(ProductImage).filter(ProductImage.product_id == product_id).update(
        {ProductImage.is_primary: False}
    )
    primary.is_primary = True
    product = db.get(Product, product_id)
    if product is not None:
        product.image_url = primary.url
        db.add(product)
    db.add(primary)
    db.commit()


def set_primary_product_image(
    db: Session, user, product_id: int, image_id: int
) -> ProductImageRead:
    """Definit l'image principale d'un produit (proprietaire uniquement)."""
    _ensure_product_seller(db, user, product_id)
    image = db.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image introuvable"
        )
    _set_single_primary(db, product_id, image)
    db.refresh(image)
    return ProductImageRead.model_validate(image)


def delete_product_image(db: Session, user, product_id: int, image_id: int) -> None:
    """Supprime une image d'un produit (proprietaire uniquement).

    Si l'image supprimee etait l'image principale, la premiere image restante
    (ou le champ image_url du produit) reprend le role principal.
    """
    product = _ensure_product_seller(db, user, product_id)
    image = db.get(ProductImage, image_id)
    if image is None or image.product_id != product_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Image introuvable"
        )
    was_primary = image.is_primary
    url = image.url
    db.delete(image)
    db.flush()
    remaining = (
        db.query(ProductImage)
        .filter(ProductImage.product_id == product_id)
        .order_by(ProductImage.position)
        .all()
    )
    if was_primary and remaining:
        _set_single_primary(db, product_id, remaining[0])
    elif not remaining:
        product.image_url = None
        db.add(product)
    db.commit()
    delete_image_file(url, product_id)


# --------------------------------------------------- CRUD prix (commercant)
def _record_price_history(db: Session, price: Price) -> None:
    """Conserve l'ancienne valeur d'une offre avant modification."""
    db.add(
        PriceHistory(
            price_id=price.id,
            amount=float(price.amount),
            currency=price.currency,
            is_available=price.is_available,
            changed_at=price.updated_at,
        )
    )


def create_price(
    db: Session, user, store_id: int, product_id: int, payload
) -> PriceManageRead:
    """Ajoute ou met a jour une offre de prix pour un produit dans une boutique."""
    store = _ensure_store_owner_of_price(db, store_id, user)
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )
    existing = (
        db.query(Price)
        .filter(Price.store_id == store_id, Price.product_id == product_id)
        .first()
    )
    old_amount: float | None = None
    if existing:
        amount_changed = float(existing.amount) != payload.amount
        availability_changed = existing.is_available != payload.is_available
        if amount_changed or availability_changed:
            _record_price_history(db, existing)
        if amount_changed:
            old_amount = float(existing.amount)
        existing.amount = payload.amount
        existing.is_available = payload.is_available
        existing.updated_at = utcnow()
        price = existing
    else:
        price = Price(
            product_id=product_id,
            store_id=store_id,
            amount=payload.amount,
            is_available=payload.is_available,
        )
        db.add(price)
    if old_amount is not None:
        notifications.notify_price_updated(
            db, product, store, price, old_amount, payload.amount
        )
    price_alerts.check_alerts_for_product(db, product_id)
    db.commit()
    db.refresh(price)
    return PriceManageRead(
        id=price.id,
        product_id=price.product_id,
        product_name=product.name,
        amount=float(price.amount),
        currency=price.currency,
        is_available=price.is_available,
        verification_status=price.verification_status,
        updated_at=price.updated_at,
        confirmed_count=price.confirmed_count,
        trust_score=compute_trust_score(db, price, store),
    )


def list_my_prices(db: Session, user, store_id: int) -> list[PriceManageRead]:
    """Liste les offres de prix d'une boutique du commerçant."""
    _ensure_store_owner_of_price(db, store_id, user)
    prices = (
        db.query(Price)
        .filter(Price.store_id == store_id)
        .join(Product, Price.product_id == Product.id)
        .order_by(Product.name)
        .all()
    )
    return [
        PriceManageRead(
            id=p.id,
            product_id=p.product_id,
            product_name=p.product.name if p.product else None,
            amount=float(p.amount),
            currency=p.currency,
            is_available=p.is_available,
            verification_status=p.verification_status,
            updated_at=p.updated_at,
            confirmed_count=p.confirmed_count,
            trust_score=compute_trust_score(db, p, p.store) if p.store else 0,
        )
        for p in prices
    ]


def update_price(db: Session, user, price_id: int, payload) -> PriceManageRead:
    """Met a jour une offre de prix (proprietaire de la boutique)."""
    price = db.get(Price, price_id)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Offre de prix introuvable"
        )
    store = _ensure_store_owner_of_price(db, price.store_id, user)
    amount_changes = payload.amount is not None and float(price.amount) != payload.amount
    availability_changes = (
        payload.is_available is not None and price.is_available != payload.is_available
    )
    if amount_changes or availability_changes:
        _record_price_history(db, price)
    old_amount = float(price.amount) if amount_changes else None
    if payload.amount is not None:
        price.amount = payload.amount
    if payload.is_available is not None:
        price.is_available = payload.is_available
    price.updated_at = utcnow()
    db.add(price)
    product = db.get(Product, price.product_id)
    if old_amount is not None:
        notifications.notify_price_updated(
            db, product, store, price, old_amount, float(price.amount)
        )
    price_alerts.check_alerts_for_product(db, price.product_id)
    db.commit()
    db.refresh(price)
    return PriceManageRead(
        id=price.id,
        product_id=price.product_id,
        product_name=product.name if product else None,
        amount=float(price.amount),
        currency=price.currency,
        is_available=price.is_available,
        verification_status=price.verification_status,
        updated_at=price.updated_at,
        confirmed_count=price.confirmed_count,
        trust_score=compute_trust_score(db, price, store),
    )


def delete_price(db: Session, user, price_id: int) -> None:
    """Supprime une offre de prix."""
    price = db.get(Price, price_id)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Offre de prix introuvable"
        )
    _ensure_store_owner_of_price(db, price.store_id, user)
    db.delete(price)
    db.commit()