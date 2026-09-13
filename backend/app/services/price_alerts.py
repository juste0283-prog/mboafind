"""Service des alertes de prix.

Un client indique un prix cible pour un produit. L'alerte est consideree
declenchee des que le prix le plus bas disponible passe sous ou egal a la
cible. Le declenchement est verifie en lecture (le compte fait office de
notifications pour le MVP) et signale immediate si le prix est deja atteint.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import PriceAlert, Price, Product
from app.models.enums import NotificationType
from app.services.notifications import create_notification
from app.utils.time import utcnow


def _ensure_product(db: Session, product_id: int) -> Product:
    """Charge et valide le produit cible de l'alerte."""
    product = db.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
        )
    return product


def current_min_price(db: Session, product_id: int) -> float | None:
    """Prix le plus bas actuellement disponible pour un produit (XAF)."""
    amount = (
        db.query(Price.amount)
        .filter(Price.product_id == product_id, Price.is_available.is_(True))
        .order_by(Price.amount.asc())
        .first()
    )
    return float(amount[0]) if amount else None


def _evaluate(alert: PriceAlert, current: float | None) -> None:
    """Met a jour le flag declenche selon le prix observe."""
    triggered = current is not None and float(alert.target_price) >= current
    if triggered and not alert.triggered:
        alert.triggered = True
        alert.triggered_at = utcnow()
    elif not triggered:
        alert.triggered = False
        alert.triggered_at = None


def check_alerts_for_product(db: Session, product_id: int) -> None:
    """Evalue les alertes actives d'un produit apres un changement de prix.

    Appele quand un commercant cree ou met a jour un prix : toute alerte
    active non encore declenchee dont la cible est atteinte passe en
    declenchee et l'utilisateur recoit une notification in-app. N'emet
    aucune notification si le prix remonte (l'alerte redevient inactive).
    """
    # La session est configuree sans autoflush : on materialise le prix
    # en cours de modification avant de lire le prix minimum observe.
    db.flush()
    current = current_min_price(db, product_id)
    if current is None:
        return
    product = db.get(Product, product_id)
    name = product.name if product else str(product_id)
    alerts = (
        db.query(PriceAlert)
        .filter(
            PriceAlert.product_id == product_id,
            PriceAlert.is_active.is_(True),
            PriceAlert.triggered.is_(False),
        )
        .all()
    )
    for alert in alerts:
        if float(alert.target_price) >= current:
            alert.triggered = True
            alert.triggered_at = utcnow()
            create_notification(
                db,
                alert.user_id,
                NotificationType.PRICE_ALERT_TRIGGERED,
                title="Alerte de prix atteinte",
                message=(
                    f"Le produit {name} est maintenant disponible a "
                    f"{current:,.0f} FCFA, sous votre cible de "
                    f"{float(alert.target_price):,.0f} FCFA."
                ),
                data={"product_id": product_id, "price": current},
            )


def build_alert_read(db: Session, alert: PriceAlert) -> dict:
    """Enrichit une alerte avec le produit et le prix actuel observe."""
    product = db.get(Product, alert.product_id)
    name = product.name if product else str(alert.product_id)
    image = product.image_url if product else None
    return {
        "id": alert.id,
        "product_id": alert.product_id,
        "product_name": name,
        "product_image": image,
        "current_price": current_min_price(db, alert.product_id),
        "target_price": float(alert.target_price),
        "currency": alert.currency,
        "is_active": alert.is_active,
        "triggered": alert.triggered,
        "triggered_at": alert.triggered_at,
        "created_at": alert.created_at,
        "updated_at": alert.updated_at,
    }


def upsert_alert(
    db: Session, user, product_id: int, target_price: float, currency: str = "XAF"
) -> PriceAlert:
    """Cree ou met a jour l'alerte de prix d'un produit (idempotent)."""
    _ensure_product(db, product_id)
    alert = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == user.id, PriceAlert.product_id == product_id)
        .first()
    )
    if alert is None:
        alert = PriceAlert(user_id=user.id, product_id=product_id)
        db.add(alert)
    alert.target_price = target_price
    alert.currency = currency or "XAF"
    alert.is_active = True
    _evaluate(alert, current_min_price(db, product_id))
    db.commit()
    db.refresh(alert)
    return alert


def list_alerts(db: Session, user, triggered_only: bool = False) -> list[dict]:
    """Alertes de l'utilisateur, en reevaluant le declenchement."""
    alerts = (
        db.query(PriceAlert)
        .filter(PriceAlert.user_id == user.id)
        .order_by(PriceAlert.created_at.desc())
        .all()
    )

    changed = False
    result = []
    for alert in alerts:
        if alert.is_active:
            _evaluate(alert, current_min_price(db, alert.product_id))
            changed = changed or alert.triggered
        read = build_alert_read(db, alert)
        if not triggered_only or read["triggered"]:
            result.append(read)
    if changed:
        db.commit()
    return result


def update_alert(
    db: Session,
    user,
    alert_id: int,
    *,
    target_price: float | None = None,
    is_active: bool | None = None,
) -> PriceAlert:
    """Modifie une alerte appartenant a l'utilisateur."""
    alert = db.get(PriceAlert, alert_id)
    if alert is None or alert.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alerte introuvable"
        )
    if target_price is not None:
        alert.target_price = target_price
        alert.is_active = True
    if is_active is not None:
        alert.is_active = is_active
    _evaluate(alert, current_min_price(db, alert.product_id))
    db.commit()
    db.refresh(alert)
    return alert


def delete_alert(db: Session, user, alert_id: int) -> None:
    """Supprime une alerte appartenant a l'utilisateur."""
    alert = db.get(PriceAlert, alert_id)
    if alert is None or alert.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Alerte introuvable"
        )
    db.delete(alert)
    db.commit()