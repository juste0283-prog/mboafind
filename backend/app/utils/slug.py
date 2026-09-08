"""Utilitaires de slugification (URL-friendly)."""

import re
import unicodedata


def slugify(value: str) -> str:
    """Transforme une chaine en slug URL.

    Exemple : "Riz 25kg - Yaounde" -> "riz-25kg-yaounde"

    Les caracteres accentues sont normalises (ecriture sans accent).
    """
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")