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
from app.models.enums import ReviewModerationStatus
from app.schemas.category import CategoryRead, CategorySummary
from app.schemas.price import PriceConfirmRead, PriceRead
from app.schemas.product import ProductDetail, ProductListItem, ProductPage
from app.schemas.store import StoreDetail
from app.utils.slug import normalize_text, split_terms
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


def _price_to_read(price: Price, store: Store) -> PriceRead:
    """Serialize une offre (prix + boutique)."""
    return PriceRead(
        id=price.id,
        store_id=store.id,
        store_name=store.name,
        store_city=store.city,
        store_is_verified=store.is_verified,
        amount=float(price.amount),
        currency=price.currency,
        is_available=price.is_available,
        verification_status=price.verification_status,
        updated_at=price.updated_at,
        confirmed_count=price.confirmed_count,
        last_confirmed_at=price.last_confirmed_at,
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


def _closest_store_distance(product: Product, lat: float, lng: float) -> float:
    """Distance minimale (km) entre un point et les boutiques du produit."""
    distances = [
        haversine_km(lat, lng, store.latitude, store.longitude)
        for store in product.stores
        if store.latitude is not None and store.longitude is not None
    ]
    return min(distances) if distances else math.inf
def get_product(db: Session, product_id: int) -> ProductDetail:
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

    offers = [_price_to_read(price, store) for price, store, _ in rows]
    # Offres disponibles d'abord, puis par prix croissant.
    offers.sort(key=lambda o: (not o.is_available, o.amount))

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
    )


def confirm_price(db: Session, price_id: int) -> PriceConfirmRead:
    """Un client confirme qu'un prix observe est exact (6.3, workflow prix)."""
    price = db.get(Price, price_id)
    if price is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Offre de prix introuvable"
        )
    price.confirmed_count += 1
    price.last_confirmed_at = utcnow()
    db.add(price)
    db.commit()
    db.refresh(price)
    return PriceConfirmRead(
        price_id=price.id,
        confirmed_count=price.confirmed_count,
        last_confirmed_at=price.last_confirmed_at,
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