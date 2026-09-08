"""Routes d'authentification (/api/v1/auth/*)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.core.security import create_access_token
from app.models import User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserCreate, UserRead
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=201,
    summary="Creer un compte",
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """Inscription d'un nouvel utilisateur (email unique)."""
    return auth_service.register_user(db, payload)


@router.post("/login", response_model=Token, summary="Se connecter")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    """Authentification : retourne un token JWT en cas de succes."""
    user = auth_service.authenticate_user(db, payload.email, payload.password)
    return Token(access_token=create_access_token(subject=user.id))


@router.get("/me", response_model=UserRead, summary="Profil de l'utilisateur courant")
def me(current_user: User = Depends(get_current_active_user)) -> User:
    """Retourne le profil de l'utilisateur associe au token."""
    return current_user