"""Recherche en langage naturel.

Interpretation cote serveur d'une requete libre en francais, par exemple :
    « ordinateur portable a Yaounde, moins de 200 000 francs »
    « telephone pas cher a Douala sous 150000 »
Devient : produit « ordinateur portable », ville « Yaounde » / « Douala »,
prix maximum 200 000 / 150 000 XAF. Aucune IA externe : reconnaissance
par dictionnaires (villes, categories) et expressions de prix.
"""

import re
import unicodedata
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Store

# Nombre entier eventuellement espace (ex. « 200 000 »).
_NUMBER = r"\d+(?:\s+\d+)*"

_PRICE_PATTERNS: list[tuple[re.Pattern, str]] = [
    # fourchette : « entre X et Y », « de X a Y »
    (re.compile(rf"\bentre\s+({_NUMBER})\s*(?:et|à|a|-|–)\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "range"),
    (re.compile(rf"\bde\s+({_NUMBER})\s*(?:à|a|-|–|et)\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "range"),
    # maximum : « moins de X », « max X », « sous X », « budget X », « < X »
    (re.compile(rf"\b(?:moins\s+de|max(?:imum)?|sous|en\s+dessous\s+de|à\s+moins\s+de|a\s+moins\s+de|budget(?:s)?(?:\s+de)?)\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "max"),
    (re.compile(rf"<\s*=?\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "max"),
    # minimum : « plus de X », « à partir de X », « au moins X », « > X »
    (re.compile(rf"\b(?:plus\s+de|à\s+partir\s+de|a\s+partir\s+de|minimum|au\s+moins|supérieur\s+à|superieur\s+a)\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "min"),
    (re.compile(rf">\s*=?\s*({_NUMBER})(?:\s*(?:fcfa|xaf))?\b"), "min"),
    # budget nu : « 200 000 FCFA » ou « 150000 Xaf »
    (re.compile(rf"\b({_NUMBER})\s*(?:fcfa|xaf)\b"), "budget"),
]


def _normalize(value: str) -> str:
    """Minuscule, sans accents, sans caracteres parasites."""
    folded = unicodedata.normalize("NFD", value.lower())
    return "".join(c for c in folded if unicodedata.category(c) != "Mn").strip()


def _to_float(token: str) -> float:
    return float(re.sub(r"\s+", "", token))


@dataclass
class ParsedQuery:
    """Requete interpretee par la recherche en langage naturel."""

    search: str = ""
    city: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    min_price: float | None = None
    max_price: float | None = None
    detected: bool = False
    used_cities: list[str] = field(default_factory=list)
    used_categories: list[str] = field(default_factory=list)


def _extract_prices(query: str) -> tuple[dict, list[tuple[int, int]]]:
    """Extrait les contraintes de prix et les zones de texte consommees."""
    constraints: dict[str, float] = {}
    spans: list[tuple[int, int]] = []

    def remember(kind: str, *tokens: str) -> None:
        values = [_to_float(t) for t in tokens]
        if kind == "range":
            constraints["min_price"] = min(values)
            constraints["max_price"] = max(values)
        elif kind in ("max", "budget"):
            constraints["max_price"] = min(
                constraints.get("max_price", float("inf")), values[0]
            )
        elif kind == "min":
            constraints["min_price"] = max(
                constraints.get("min_price", 0.0), values[0]
            )

    for pattern, kind in _PRICE_PATTERNS:
        for match in pattern.finditer(query):
            groups = match.groups()
            remember(kind, *groups)
            spans.append((match.start(), match.end()))

    return constraints, spans


def _match_tokens(
    db: Session, tokens: list[str]
) -> dict[str, object]:
    """Mots-cles utilises (villes et categories) par token ou bigramme."""
    cities = db.scalars(
        select(Store.city).where(Store.city.is_not(None), Store.city != "").distinct()
    ).all()
    categories = db.scalars(select(Category)).all()

    city_map = {_normalize(c): c for c in cities if c}
    cat_by_slug = {_normalize(c.slug): c for c in categories}
    cat_by_name = {_normalize(c.name): c for c in categories}
    cat_map = {**cat_by_name, **cat_by_slug}

    used_tokens: list[str] = []
    consumed: set[str] = set()
    city: str | None = None
    category_id: int | None = None
    category_name: str | None = None

    def consume(*raw: str) -> None:
        for piece in raw:
            if _normalize(piece) not in consumed:
                consumed.add(_normalize(piece))
                used_tokens.append(piece)

    for i, token in enumerate(tokens):
        norm = _normalize(token)
        if city is None:
            if norm in city_map:
                city = city_map[norm]
                consume(token)
                continue
            if i + 1 < len(tokens):
                bigram = f"{token} {tokens[i + 1]}"
                if _normalize(bigram) in city_map:
                    city = city_map[_normalize(bigram)]
                    consume(token, tokens[i + 1])
                    continue
        if category_id is None and norm in cat_map:
            category_id = cat_map[norm].id
            category_name = cat_map[norm].name
            consume(token)

    return {
        "city": city,
        "category_id": category_id,
        "category_name": category_name,
        "used_tokens": used_tokens,
    }


def parse_natural_query(db: Session, text: str) -> ParsedQuery:
    """Interpretation pure (sans execution de la recherche)."""
    if not text or not text.strip():
        return ParsedQuery()

    query = text.strip()
    constraints, spans = _extract_prices(query)

    # Texte nettoye : requete initiale sans les expressions de prix.
    pieces: list[str] = []
    cursor = 0
    for start, end in sorted(spans):
        if start >= cursor:
            pieces.append(query[cursor:start])
            cursor = end
    pieces.append(query[cursor:])
    tokens = [
        token.strip(".,;:!?()«»\"'…–-")
        for token in re.findall(r"\S+", " ".join(pieces))
        if token.strip()
    ]

    matches = _match_tokens(db, tokens)
    consumed = {_normalize(u) for u in matches["used_tokens"]}
    remaining = [
        token for token in tokens if _normalize(token) not in consumed
    ]
    search_text = " ".join(remaining).strip()

    return ParsedQuery(
        search=search_text,
        city=matches["city"],
        category_id=matches["category_id"],
        category_name=matches["category_name"],
        min_price=constraints.get("min_price"),
        max_price=constraints.get("max_price"),
        detected=bool(constraints or matches["city"] or matches["category_id"]),
        used_cities=[],
        used_categories=matches["used_tokens"],
    )


def natural_search(db: Session, text: str, page: int = 1, page_size: int = 20) -> dict:
    """Execute la recherche en langage naturel et serialise le resultat.

    Renvoie l'interpretation (pour affichage) ainsi que la page de produits
    au meme format que l'endpoint /products.
    """
    from app.services import catalog

    parsed = parse_natural_query(db, text)
    search = parsed.search or (text.strip() if not parsed.detected else "")

    result = catalog.search_products(
        db,
        search=search or None,
        category_id=parsed.category_id,
        city=parsed.city,
        min_price=parsed.min_price,
        max_price=parsed.max_price,
        page=page,
        page_size=page_size,
    )

    return {
        "interpretation": {
            "query": text.strip(),
            "search": parsed.search,
            "city": parsed.city,
            "category_id": parsed.category_id,
            "category_name": parsed.category_name,
            "min_price": parsed.min_price,
            "max_price": parsed.max_price,
            "detected": parsed.detected,
        },
        "items": result.items,
        "total": result.total,
        "page": result.page,
        "page_size": result.page_size,
    }