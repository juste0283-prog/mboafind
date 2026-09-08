"""Enumerations partagees par les modeles MboaFind."""

import enum


class UserRole(str, enum.Enum):
    """Roles des utilisateurs de la plateforme."""
    CLIENT = "CLIENT"
    COMMERCANT = "COMMERCANT"
    PROFESSIONNEL = "PROFESSIONNEL"
    ADMIN = "ADMIN"


class PriceVerificationStatus(str, enum.Enum):
    """Statut de verification d'un prix."""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ServiceRequestStatus(str, enum.Enum):
    """Statut d'une demande de service."""
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class ReviewModerationStatus(str, enum.Enum):
    """Statut de moderation d'un avis."""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ReportStatus(str, enum.Enum):
    """Statut de traitement d'un signalement."""
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"