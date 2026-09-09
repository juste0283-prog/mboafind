"""Service de confiance (section 7 - Systeme de confiance de MboaFind).

Calcule un score de confiance 0-100 pour une offre de prix a partir de :
- source (statut de verification, boutique verifiee) ;
- fraicheur (date de mise a jour) ;
- confirmations utilisateur ;
- signalements en attente ;
- disponibilite.

Le score reste simple aujourd'hui mais le module peut evoluer sans casser
l'existant (nouveaux signaux = nouvelles regles ici).
"""

from datetime import timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Report, Store
from app.models.enums import (
    PriceVerificationStatus,
    ReportStatus,
    ReportTargetType,
)
from app.models.price import Price
from app.utils.time import utcnow

BASE_SCORE = 10


def _recency_points(price: Price) -> int:
    """Points de fraicheur : une donnee recente est plus fiable."""
    updated = price.updated_at
    if updated is None:
        return 0
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    now = utcnow()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    age_hours = max(0, (now - updated).total_seconds() / 3600)
    if age_hours < 24:
        return 25
    if age_hours < 7 * 24:
        return 15
    if age_hours < 30 * 24:
        return 5
    return 0


def _pending_report_penalty(db: Session, price_id: int) -> int:
    """Penalite en fonction des signalements de prix en attente."""
    count = (
        db.query(func.count(Report.id))
        .filter(
            Report.target_type == ReportTargetType.PRICE,
            Report.target_id == price_id,
            Report.status == ReportStatus.PENDING,
        )
        .scalar()
        or 0
    )
    return min(20, count * 5)


def compute_trust_score(db: Session, price: Price, store: Store) -> int:
    """Score de confiance 0-100 d'une offre de prix."""
    score = BASE_SCORE

    if price.verification_status == PriceVerificationStatus.VERIFIED:
        score += 20
    elif price.verification_status == PriceVerificationStatus.REJECTED:
        score -= 30

    score += min(30, price.confirmed_count * 5)

    if price.is_available:
        score += 10

    if store.is_verified:
        score += 10

    score += _recency_points(price)
    score -= _pending_report_penalty(db, price.id)

    return max(0, min(100, score))