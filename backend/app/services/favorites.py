"""Service des favoris.

Un utilisateur sauvegarde des produits, commerces ou professionnels. Les
operations sont idempotentes : ajouter deux fois le meme favori ne cree pas de
doublon (contrainte unique) et supprimer un favori absent renvoie simplement
un succes.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Favorite, Professional, Product, Store
from app.models.enums import FavoriteItemType


def _load_item(db: Session, item_type: FavoriteItemType, item_id: int):
    """Charge et valide l'objet cible du favori (retourne son display name + city)."""
    if item_type == FavoriteItemType.PRODUCT:
        item = db.get(Product, item_id)
        if item is None or not item.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Produit introuvable"
            )
        return item.name, None
    if item_type == FavoriteItemType.STORE:
        item = db.get(Store, item_id)
        if item is None or not item.is_active:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Boutique introuvable"
            )
        return item.name, item.city
    if item_type == FavoriteItemType.PROFESSIONAL:
        item = db.get(Professional, item_id)
        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professionnel introuvable",
            )
        name = item.user.full_name if item.user else item.profession
        return name, item.city
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Type invalide")


def is_favorite(db: Session, user_id: int, item_type: FavoriteItemType, item_id: int) -> bool:
    """True si l'objet est deja en favori de l'utilisateur."""
    return (
        db.query(Favorite.id)
        .filter(
            Favorite.user_id == user_id,
            Favorite.item_type == item_type,
            Favorite.item_id == item_id,
        )
        .first()
        is not None
    )


def build_favorite_read(db: Session, fav: Favorite) -> dict:
    """Enrichit un favori avec le nom/city de l'objet (pour la reponse API)."""
    name, city = _load_item(db, fav.item_type, fav.item_id)
    return {
        "id": fav.id,
        "item_type": fav.item_type,
        "item_id": fav.item_id,
        "item_name": name,
        "item_city": city,
        "created_at": fav.created_at,
    }


def add_favorite(db: Session, user, item_type: FavoriteItemType, item_id: int) -> Favorite:
    """Ajoute un favori (idempotent)."""
    _load_item(db, item_type, item_id)
    existing = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == user.id,
            Favorite.item_type == item_type,
            Favorite.item_id == item_id,
        )
        .first()
    )
    if existing:
        return existing
    favorite = Favorite(user_id=user.id, item_type=item_type, item_id=item_id)
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite


def remove_favorite(db: Session, user, item_type: FavoriteItemType, item_id: int) -> None:
    """Supprime un favori (idempotent meme si absent)."""
    existing = (
        db.query(Favorite)
        .filter(
            Favorite.user_id == user.id,
            Favorite.item_type == item_type,
            Favorite.item_id == item_id,
        )
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()


def list_favorites(
    db: Session, user, item_type: FavoriteItemType | None = None
) -> list:
    """Favoris de l'utilisateur, enrichis du nom/city de l'objet."""
    query = db.query(Favorite).filter(Favorite.user_id == user.id)
    if item_type is not None:
        query = query.filter(Favorite.item_type == item_type)
    favorites = query.order_by(Favorite.created_at.desc()).all()

    result = []
    for fav in favorites:
        try:
            result.append(build_favorite_read(db, fav))
        except HTTPException:
            continue
    return result