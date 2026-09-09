"""Geocodage best-effort via Nominatim (OpenStreetMap, sans cle).

Utilise pour donner une position par defaut a une boutique dont le
commercant n'a pas depose de marqueur sur la carte. Aucune erreur
n'est propagee : si la recherche echoue, on laisse les coordonnees vides.
"""

import json
import logging
import urllib.parse
import urllib.request

from app.core.config import settings

logger = logging.getLogger(__name__)

_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_USER_AGENT = "MboaFind/0.1 (contact: demo@mboafind.cm)"


def geocode_enabled() -> bool:
    """Le geocodage est actif hors environnement de test."""
    return settings.GEOCODE_ENABLED and settings.ENVIRONMENT != "testing"


def _search(query: str) -> tuple[float, float] | None:
    """Interroge Nominatim et retourne (latitude, longitude) ou None."""
    if not query:
        return None
    params = urllib.parse.urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
            "accept-language": "fr",
        }
    )
    request = urllib.request.Request(
        f"{_NOMINATIM_URL}?{params}", headers={"User-Agent": _USER_AGENT}
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        logger.warning("Geocoding introuvable/erreur reseau pour %r", query)
        return None

    if not payload:
        return None
    try:
        return float(payload[0]["lat"]), float(payload[0]["lon"])
    except (KeyError, TypeError, ValueError):
        return None


def geocode_address(city: str | None, address: str | None) -> tuple[float, float] | None:
    """Retourne (latitude, longitude) depuis la ville/adresse, sinon None.

    Essai 1 : adresse complete, ville, Cameroun.
    Essai 2 (repli) : ville, Cameroun.
    La recherche est limitee au Cameroun pour eviter les homonymes.
    """
    parts = [p.strip() for p in (address, city, "Cameroun") if p and p.strip()]
    full = ", ".join(parts)
    result = _search(full)
    if result is not None:
        return result

    parts = [p.strip() for p in (city, "Cameroun") if p and p.strip()]
    return _search(", ".join(parts))