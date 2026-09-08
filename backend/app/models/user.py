"""Modele utilisateur (users) et relations associees."""

from datetime import datetime

from sqlalchemy import DateTime, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.enums import UserRole
from app.utils.time import utcnow


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CLIENT, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relations
    stores: Mapped[list["Store"]] = relationship(back_populates="owner")
    professional: Mapped["Professional | None"] = relationship(back_populates="user", uselist=False)
    reviews: Mapped[list["Review"]] = relationship(back_populates="author")
    reports: Mapped[list["Report"]] = relationship(back_populates="reporter")

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"