"""Schemas Pydantic des avis (notation + commentaire)."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ReviewModerationStatus


class ReviewCreate(BaseModel):
    """Creation d'un avis : sur un commerce OU un professionnel.

    L'eligibilite (interaction reelle) est verifiee cote service.
    """

    store_id: int | None = None
    professional_id: int | None = None
    rating: int = Field(ge=1, le=5)
    comment: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def check_target(self) -> "ReviewCreate":
        if (self.store_id is None) == (self.professional_id is None):
            raise ValueError(
                "Un avis doit cibler exactement une boutique OU un professionnel"
            )
        return self


class ReviewRead(BaseModel):
    """Avis public (uniquement les avis approuves en lecture publique)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    author_id: int
    author_name: str | None = None
    store_id: int | None = None
    professional_id: int | None = None
    rating: int
    comment: str | None = None
    moderation_status: ReviewModerationStatus
    created_at: datetime


class ReviewModerationUpdate(BaseModel):
    """Decision de moderation d'un avis : approuve, en attente ou rejete."""

    moderation_status: ReviewModerationStatus


class ReviewPage(BaseModel):
    """Reponse paginee d'une liste d'avis."""

    items: list[ReviewRead]
    total: int
    page: int
    page_size: int