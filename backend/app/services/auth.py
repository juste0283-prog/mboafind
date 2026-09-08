"""Service d'authentification et de gestion des utilisateurs.

Concentre la logique metier : les routers restent fins et ne font
que brancher les requetes HTTP vers ces fonctions.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models import User
from app.schemas.user import UserCreate, UserUpdate


def get_user_by_email(db: Session, email: str) -> User | None:
    """Recherche un utilisateur par son email (comparaison en minuscules)."""
    return db.query(User).filter(User.email == email.strip().lower()).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Recherche un utilisateur par son identifiant."""
    return db.get(User, user_id)


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Verifie les identifiants et retourne l'utilisateur ou leve une 401."""
    user = get_user_by_email(db, email)
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def register_user(db: Session, data: UserCreate) -> User:
    """Cree un compte utilisateur (email unique, mot de passe hache Argon2)."""
    email = data.email.strip().lower()
    if get_user_by_email(db, email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte existe deja avec cet email",
        )
    user = User(
        email=email,
        full_name=data.full_name,
        phone=data.phone,
        password_hash=hash_password(data.password),
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, data: UserUpdate) -> User:
    """Met a jour les champs fournis (mot de passe re-hache si modifie)."""
    if data.full_name is not None:
        user.full_name = data.full_name
    if data.phone is not None:
        user.phone = data.phone
    if data.password is not None:
        user.password_hash = hash_password(data.password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user