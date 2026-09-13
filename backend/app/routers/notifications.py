"""Routes des notifications in-app (/api/v1/notifications)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationRead,
    UnreadCountResponse,
)
from app.services import notifications

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse, summary="Mes notifications")
def list_notifications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Dernieres notifications de l'utilisateur, les plus recentes d'abord."""
    return notifications.list_notifications(db, current_user, page=page, page_size=page_size)


@router.get(
    "/unread-count",
    response_model=UnreadCountResponse,
    summary="Nombre de notifications non lues",
)
def unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Nombre de notifications non lues (pour le badge de la cloche)."""
    return {"count": notifications.unread_count(db, current_user)}


@router.post(
    "/read-all",
    response_model=UnreadCountResponse,
    summary="Tout marquer comme lu",
)
def mark_all_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Marque toutes les notifications de l'utilisateur comme lues."""
    return {"count": notifications.mark_all_read(db, current_user)}


@router.post(
    "/{notification_id}/read",
    response_model=NotificationRead,
    summary="Marquer une notification comme lue",
)
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Marque une notification specifique comme lue."""
    n = notifications.mark_read(db, current_user, notification_id)
    return {
        "id": n.id,
        "type": n.type.value,
        "title": n.title,
        "message": n.message,
        "data": n.data_dict,
        "is_read": n.is_read,
        "created_at": n.created_at,
        "read_at": n.read_at,
    }


@router.delete("/{notification_id}", status_code=204, summary="Supprimer une notification")
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Supprime une notification appartenant a l'utilisateur."""
    notifications.delete_notification(db, current_user, notification_id)