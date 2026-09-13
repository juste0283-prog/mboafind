"""Service de la console d'administration.

Fournit la synthese statistique, la gestion des boutiques et
professionnels (verification) et la gestion des comptes utilisateurs
(activation / suspension), avec notification a l'utilisateur concerne.
"""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Notification,
    Price,
    PriceHistory,
    Product,
    Professional,
    Report,
    Review,
    ServiceRequest,
    Store,
    User,
)
from app.models.enums import (
    NotificationType,
    ReportStatus,
    ReviewModerationStatus,
    UserRole,
)
from app.models.product import product_store
from app.schemas.admin import (
    AdminOverview,
    AdminProfessionalItem,
    AdminProfessionalList,
    AdminStoreItem,
    AdminStoreList,
    AdminUserItem,
    AdminUserList,
)
from app.services.notifications import create_notification


def get_overview(db: Session) -> AdminOverview:
    """Synthese chiffree de la plateforme pour l'ecran d'accueil admin."""
    users_total = db.scalar(select(func.count(User.id))) or 0
    users_clients = (
        db.scalar(select(func.count(User.id)).where(User.role == UserRole.CLIENT)) or 0
    )
    users_commersants = (
        db.scalar(select(func.count(User.id)).where(User.role == UserRole.COMMERCANT))
        or 0
    )
    users_professionals = (
        db.scalar(select(func.count(User.id)).where(User.role == UserRole.PROFESSIONNEL))
        or 0
    )
    users_admins = (
        db.scalar(select(func.count(User.id)).where(User.role == UserRole.ADMIN)) or 0
    )

    stores_total = db.scalar(select(func.count(Store.id))) or 0
    stores_verified = (
        db.scalar(select(func.count(Store.id)).where(Store.is_verified.is_(True))) or 0
    )
    stores_pending = stores_total - stores_verified

    products_total = db.scalar(select(func.count(Product.id))) or 0
    prices_total = db.scalar(select(func.count(Price.id))) or 0
    categories_total = db.scalar(
        select(func.count(Product.category_id.distinct()))
    ) or 0

    reports_total = db.scalar(select(func.count(Report.id))) or 0
    reports_pending = (
        db.scalar(select(func.count(Report.id)).where(Report.status == ReportStatus.PENDING))
        or 0
    )

    reviews_total = db.scalar(select(func.count(Review.id))) or 0
    reviews_pending = (
        db.scalar(
            select(func.count(Review.id)).where(
                Review.moderation_status == ReviewModerationStatus.PENDING
            )
        )
        or 0
    )

    service_requests_total = db.scalar(select(func.count(ServiceRequest.id))) or 0
    price_updates_total = db.scalar(select(func.count(PriceHistory.id))) or 0

    return AdminOverview(
        users_total=users_total,
        users_clients=users_clients,
        users_commersants=users_commersants,
        users_professionals=users_professionals,
        users_admins=users_admins,
        stores_total=stores_total,
        stores_verified=stores_verified,
        stores_pending=stores_pending,
        products_total=products_total,
        prices_total=prices_total,
        categories_total=categories_total,
        reports_total=reports_total,
        reports_pending=reports_pending,
        reviews_total=reviews_total,
        reviews_pending=reviews_pending,
        service_requests_total=service_requests_total,
        price_updates_total=price_updates_total,
    )


def list_all_stores(db: Session) -> AdminStoreList:
    """Toutes les boutiques avec le compte proprietaire et le nb de produits."""
    product_counts = (
        select(product_store.c.store_id, func.count(product_store.c.product_id))
        .group_by(product_store.c.store_id)
        .subquery()
    )
    rows = db.execute(
        select(Store, User.email, func.coalesce(product_counts.c.count, 0))
        .join(User, User.id == Store.owner_id)
        .outerjoin(product_counts, product_counts.c.store_id == Store.id)
        .order_by(Store.created_at.desc())
    ).all()

    items = [
        AdminStoreItem(
            id=row[0].id,
            name=row[0].name,
            city=row[0].city,
            province=row[0].province,
            phone=row[0].phone,
            is_verified=row[0].is_verified,
            is_active=row[0].is_active,
            owner_email=row[1],
            products_count=int(row[2]),
        )
        for row in rows
    ]
    return AdminStoreList(items=items, total=len(items))


def _notify_store(
    db: Session, store: Store, is_verified: bool
) -> None:
    if is_verified:
        create_notification(
            db,
            store.owner_id,
            NotificationType.STORE_VERIFIED,
            "Boutique vérifiée",
            f"Votre boutique « {store.name} » est maintenant vérifiée.",
            {"store_id": store.id},
        )
    else:
        create_notification(
            db,
            store.owner_id,
            NotificationType.STORE_VERIFIED,
            "Boutique non vérifiée",
            f"La vérification de votre boutique « {store.name} » a été retirée.",
            {"store_id": store.id},
        )


def set_store_verify(db: Session, store_id: int, is_verified: bool) -> AdminStoreItem:
    """Verifie / retire la verification d'une boutique et notifie son proprietaire."""
    store = db.get(Store, store_id)
    if store is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Boutique introuvable.")
    if store.is_verified != is_verified:
        store.is_verified = is_verified
        _notify_store(db, store, is_verified)
        db.commit()

    product_counts = (
        select(product_store.c.store_id, func.count(product_store.c.product_id))
        .where(product_store.c.store_id == store_id)
        .group_by(product_store.c.store_id)
    )
    products_count = int(db.scalar(product_counts) or 0)
    return AdminStoreItem(
        id=store.id,
        name=store.name,
        city=store.city,
        province=store.province,
        phone=store.phone,
        is_verified=store.is_verified,
        is_active=store.is_active,
        owner_email=store.owner.email if store.owner else None,
        products_count=products_count,
    )


def list_all_professionals(db: Session) -> AdminProfessionalList:
    """Tous les professionnels avec leur compte utilisateur."""
    rows = db.execute(
        select(Professional, User)
        .join(User, User.id == Professional.user_id)
        .order_by(Professional.created_at.desc())
    ).all()
    items = [
        AdminProfessionalItem(
            id=p.id,
            user_id=p.user_id,
            user_email=user.email,
            user_name=user.full_name,
            profession=p.profession,
            city=p.city,
            is_verified=p.is_verified,
            is_active=user.is_active,
        )
        for p, user in rows
    ]
    return AdminProfessionalList(items=items, total=len(items))


def set_professional_verify(
    db: Session, professional_id: int, is_verified: bool
) -> AdminProfessionalItem:
    """Verifie / retire la verification d'un professionnel et notifie son compte."""
    professional = db.get(Professional, professional_id)
    if professional is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Professionnel introuvable.")

    if professional.is_verified != is_verified:
        professional.is_verified = is_verified
        user = db.get(User, professional.user_id)
        if user is not None:
            if is_verified:
                create_notification(
                    db,
                    user.id,
                    NotificationType.PROFESSIONAL_VERIFIED,
                    "Profil vérifié",
                    f"Votre profil professionnel ({professional.profession}) est maintenant vérifié.",
                    {"professional_id": professional.id},
                )
            else:
                create_notification(
                    db,
                    user.id,
                    NotificationType.PROFESSIONAL_VERIFIED,
                    "Profil non vérifié",
                    f"La vérification de votre profil professionnel ({professional.profession}) a été retirée.",
                    {"professional_id": professional.id},
                )
        db.commit()

    return AdminProfessionalItem(
        id=professional.id,
        user_id=professional.user_id,
        user_email=professional.user.email if professional.user else "",
        user_name=professional.user.full_name if professional.user else None,
        profession=professional.profession,
        city=professional.city,
        is_verified=professional.is_verified,
        is_active=professional.user.is_active if professional.user else False,
    )


def list_all_users(db: Session) -> AdminUserList:
    """Tous les comptes utilisateurs (le plus recent d'abord)."""
    users = db.execute(
        select(User).order_by(User.created_at.desc())
    ).scalars().all()
    items = [
        AdminUserItem(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        )
        for user in users
    ]
    return AdminUserList(items=items, total=len(items))


def set_user_status(
    db: Session, user_id: int, is_active: bool, current_admin_id: int
) -> AdminUserItem:
    """Suspend ou reactive un compte utilisateur (interdit sur soi-meme)."""
    if user_id == current_admin_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Vous ne pouvez pas modifier le statut de votre propre compte.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable.")

    if user.is_active != is_active:
        user.is_active = is_active
        if is_active:
            create_notification(
                db,
                user.id,
                NotificationType.ACCOUNT_STATUS,
                "Compte réactivé",
                "Votre compte a été réactivé par l'administrateur.",
            )
        else:
            create_notification(
                db,
                user.id,
                NotificationType.ACCOUNT_STATUS,
                "Compte suspendu",
                "Votre compte a été suspendu par l'administrateur.",
            )
        db.commit()

    return AdminUserItem(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )