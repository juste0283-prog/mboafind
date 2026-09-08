"""Securite : hachage Argon2, JWT et utilitaires de mot de passe..

pwdlib (Argon2) pour le hachage, PyJWT pour les tokens.
Les secrets proviennent de la configuration centrale (.env)..
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash

from app.core.config import settings

# Hachage des mots de passe (Argon2, recommande OWASP)

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    """Hache un mot de passe avec Argon2."""
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifie un mot de passe en clair contre son hash Argon2."""
    return password_hash.verify(plain_password, hashed_password)


def create_access_token(
    subject: str | int, expires_delta: Optional[timedelta] = None
) -> str:
    """Cree un token JWT signe contenant l'identifiant utilisateur (sub).."""
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode: dict[str, Any] = {"sub": str(subject), "exp": expire}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict[str, Any]]:
    """Decode et valide un token JWT. Retourne None si invalide/expire.."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None


def get_token_payload(token: str) -> dict[str, Any]:
    """Decode un token et leve une 401 en cas de token invalide.."""
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expire",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload