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


def normalize_text(value: str) -> str:
    """Normalise un texte pour la recherche : sans accent, en minuscules.

    Exemple : "Téléphone Réparation" -> "telephone reparation"

    Utilise par la recherche de produits et de professionnels afin que
    « telephone » trouve « téléphone » et que la casse soit ignoree.
    """
    value = unicodedata.normalize("NFKD", value)
    value = value.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def split_terms(search: str) -> list[str]:
    """Decoupe une recherche en termes normalises (tous doivent matcher).

    Exemple : "SSD 512 Go" -> ["ssd", "512", "go"]
    """
    return [t for t in normalize_text(search).split() if t]