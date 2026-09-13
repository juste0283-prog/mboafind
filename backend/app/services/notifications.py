"""Service des notifications in-app.

Les notifications sont creees de maniere synchrone au moment de l'evenement
metier (sans commit, le commit est porte par l'appelant) puis lues par
polling cote client. Le service expose aussi la pagination, le marquage
lu / non lu et la suppression, toujours scopes a l'utilisateur courant.
"""

import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Notification, PriceAlert, User
from app.models.enums import NotificationType
from app.utils.time import utcnow


def create_notification(
    db: Session,
    user_id: int,
    ntype: NotificationType,
    title: str,
    message: str,
    data: dict | None = None,
) -> Notification:
    """Ajoute une notification pour un utilisateur (sans commit).

    L'appelant effectue son propre commit afin que la notification soit
    persistee dans la meme transaction que l'evenement declencheur.
    """
    notification = Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        data=json.dumps(data) if data else None,
    )
    db.add(notification)
    return notification


def notify_price_updated(
    db: Session,
    product,
    store,
    price,
    old_amount: float | None,
    new_amount: float,
) -> int:
    """Notifie en temps reel tous les comptes abonnes aux changements de prix.

    Seuls les changements de montant sont diffuses (un nouveau prix n'est pas
    un changement). Chaque utilisateur ayant active ``notify_price_changes``
    recoit une notification PRICE_CHANGED, sauf le proprietaire de l'offre et
    sauf ceux qui suivent deja ce produit via une alerte de prix active (ils
    recoivent l'alerte ciblee dediee). Retourne le nombre de destinataires.
    """
    if product is None or store is None:
        return 0
    old = float(old_amount) if old_amount is not None else None
    new = float(new_amount)
    if old is None or abs(old - new) < 0.01:
        return 0
    title = "Prix mis a jour"
    expected = round((old - new) / old * 100, 1) if old > 0 and old > new else 0.0
    message = (
        f"{product.name} : {old:,.0f} -> {new:,.0f} FCFA"
        + (f" (-{expected:.1f}%)" if expected > 0 else "")
        + f" chez {store.name}."
    )
    data = {"price_id": price.id, "product_id": product.id, "store_id": store.id}
    tracked_ids = (
        db.query(PriceAlert.user_id)
        .filter(
            PriceAlert.product_id == product.id,
            PriceAlert.is_active.is_(True),
            PriceAlert.triggered.is_(False),
        )
        .distinct()
    )
    recipients = (
        db.query(User.id)
        .filter(
            User.notify_price_changes.is_(True),
            User.is_active.is_(True),
            User.id != store.owner_id,
            User.id.notin_(tracked_ids),
        )
        .all()
    )
    for (user_id,) in recipients:
        create_notification(
            db,
            user_id,
            NotificationType.PRICE_CHANGED,
            title=title,
            message=message,
            data=data,
        )
    return len(recipients)


def list_notifications(
    db: Session, user, page: int = 1, page_size: int = 20
) -> dict:
    """Dernieres notifications de l'utilisateur (les plus recentes d'abord)."""
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    unread = unread_count(db, user)
    base = db.query(Notification).filter(Notification.user_id == user.id)
    total = base.count()
    notifications = (
        base.order_by(Notification.created_at.desc(), Notification.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [
            {
                "id": n.id,
                "type": n.type.value,
                "title": n.title,
                "message": n.message,
                "data": n.data_dict,
                "is_read": n.is_read,
                "created_at": n.created_at,
                "read_at": n.read_at,
            }
            for n in notifications
        ],
        "total": total,
        "unread": unread,
    }


def unread_count(db: Session, user) -> int:
    """Nombre de notifications non lues de l'utilisateur."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .count()
    )


def _get_owned(db: Session, user, notification_id: int) -> Notification:
    """Charge une notification appartenant a l'utilisateur courant."""
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Notification introuvable"
        )
    return notification


def mark_read(db: Session, user, notification_id: int) -> Notification:
    """Marque une notification comme lue."""
    notification = _get_owned(db, user, notification_id)
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = utcnow()
        db.commit()
        db.refresh(notification)
    return notification


def mark_all_read(db: Session, user) -> int:
    """Marque toutes les notifications de l'utilisateur comme lues."""
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user.id, Notification.is_read.is_(False))
        .all()
    )
    for notification in notifications:
        notification.is_read = True
        notification.read_at = utcnow()
    db.commit()
    return len(notifications)


def delete_notification(db: Session, user, notification_id: int) -> None:
    """Supprime une notification appartenant a l'utilisateur."""
    notification = _get_owned(db, user, notification_id)
    db.delete(notification)
    db.commit()