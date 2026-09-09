"""Schemas Pydantic des signalements d'informations incorrectes."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus, ReportTargetType


class ReportCreate(BaseModel):
    """Creation d'un signalement par un utilisateur authentifie."""

    target_type: ReportTargetType
    target_id: int
    reason: str = Field(min_length=3, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class ReportRead(BaseModel):
    """Signalement lu (par son auteur)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    reporter_id: int
    target_type: ReportTargetType
    target_id: int
    reason: str
    description: str | None = None
    status: ReportStatus
    created_at: datetime


class ReportAdminRead(BaseModel):
    """Signalement vu par un administrateur (avec nom du reporter)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    reporter_id: int
    reporter_name: str | None = None
    target_type: ReportTargetType
    target_id: int
    reason: str
    description: str | None = None
    status: ReportStatus
    created_at: datetime


class ReportModerationUpdate(BaseModel):
    """Decision de moderation d'un signalement : resolver ou classer sans suite."""

    status: ReportStatus


class ReportPage(BaseModel):
    """Reponse paginee de la liste des signalements d'un utilisateur."""

    items: list[ReportRead]
    total: int
    page: int
    page_size: int