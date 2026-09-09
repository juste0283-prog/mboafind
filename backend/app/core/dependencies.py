"""Dependances FastAPI : session base de donnees, utilisateur courant et roles.

Fournit les injections reutilisables par les routers : get_db, get_current_user,
get_current_active_user et require_roles (garde de permissions par role).
"""

from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import get_token_payload
from app.database.session import SessionLocal
from app.models import User
from app.models.enums import UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_db():
    """Fournit une session SQLAlchemy par requete."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Retourne l'utilisateur correspondant au token JWT presente.."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification requise",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = get_token_payload(credentials.credentials)
    user_id = payload.get("sub")
    user = db.get(User, int(user_id)) if user_id else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur introuvable",
        )
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Retourne l'utilisateur courant a condition qu'il soit actif.."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte utilisateur desactive",
        )
    return current_user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    """Retourne l'utilisateur courant si un token valide est presente, sinon None.

    Utilise sur les routes publiques (fiche produit, offres) pour prendre en
    compte l'etat personnel de l'utilisateur (ex. confirmed_by_me) sans exiger
    d'authentification.
    """
    if credentials is None:
        return None
    try:
        payload = get_token_payload(credentials.credentials)
    except Exception:
        return None
    user_id = payload.get("sub")
    if user_id is None:
        return None
    user = db.get(User, int(user_id))
    return user if user is not None else None


def require_roles(*roles: UserRole) -> Callable:
    """Fabrique une dependance exigeant au moins un des roles donnes.."""

    def role_checker(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour cette action",
            )
        return current_user

    return role_checker