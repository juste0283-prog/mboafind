"""Helpers temporels : remplace datetime.utcnow (deprecie en Python 3.12+)."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Retourne l'instant present en UTC (objet aware)."""
    return datetime.now(timezone.utc)