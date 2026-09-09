"""Routes des alertes de prix (/api/v1/alerts)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.user import User
from app.schemas.price_alert import PriceAlertCreate, PriceAlertRead, PriceAlertUpdate
from app.services import price_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[PriceAlertRead], summary="Mes alertes de prix")
def list_alerts(
    triggered_only: bool = Query(
        default=False, description="Ne garder que les alertes declenchees"
    ),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> list:
    """Alertes du client connecte, avec le prix actuel le plus bas observe."""
    return price_alerts.list_alerts(db, current_user, triggered_only=triggered_only)


@router.post(
    "",
    response_model=PriceAlertRead,
    status_code=201,
    summary="Créer ou mettre à jour une alerte de prix",
)
def create_alert(
    payload: PriceAlertCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Installe (ou remplace) l'alerte d'un produit : alerte quand le prix
    passe sous ou egal au prix cible. Une seule alerte par (client, produit).
    """
    alert = price_alerts.upsert_alert(
        db, current_user, payload.product_id, payload.target_price, payload.currency
    )
    return price_alerts.build_alert_read(db, alert)


@router.patch(
    "/{alert_id}",
    response_model=PriceAlertRead,
    summary="Modifier une alerte de prix",
)
def update_alert(
    alert_id: int,
    payload: PriceAlertUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """Change le prix cible ou desactive/reactive une alerte."""
    alert = price_alerts.update_alert(
        db,
        current_user,
        alert_id,
        target_price=payload.target_price,
        is_active=payload.is_active,
    )
    return price_alerts.build_alert_read(db, alert)


@router.delete("/{alert_id}", status_code=204, summary="Supprimer une alerte de prix")
def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    """Retire une alerte de prix appartenant a l'utilisateur."""
    price_alerts.delete_alert(db, current_user, alert_id)