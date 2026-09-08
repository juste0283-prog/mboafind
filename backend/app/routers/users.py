"""Routes utilisateurs (/api/v1/users/*)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models import User
from app.schemas.user import UserRead, UserUpdate
from app.services import auth as auth_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead, summary="Profil de l'utilisateur courant")
def read_me(current_user: User = Depends(get_current_active_user)) -> User:
    """Profil de l'utilisateur connecte (alias de /auth/me)."""
    return current_user


@router.patch("/me", response_model=UserRead, summary="Mettre a jour son profil")
def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """Met a jour le nom, le telephone et/ou le mot de passe."""
    return auth_service.update_user(db, current_user, payload)