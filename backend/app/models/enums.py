"""Enumerations partagees par les modeles MboaFind."""

import enum


class UserRole(str, enum.Enum):
    """Roles des utilisateurs de la plateforme."""
    CLIENT = "CLIENT"
    COMMERCANT = "COMMERCANT"
    PROFESSIONNEL = "PROFESSIONNEL"
    ADMIN = "ADMIN"


class CategoryType(str, enum.Enum):
    """Type d'une categorie : catalogue produits ou catalogue services."""
    PRODUCT = "PRODUCT"
    SERVICE = "SERVICE"


class PriceVerificationStatus(str, enum.Enum):
    """Statut de verification d'un prix."""
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ServiceRequestStatus(str, enum.Enum):
    """Statut d'une demande de service.

    Workflow (cahier des charges) : creee -> acceptee -> en cours -> terminee.
    Le client peut annuler, le professionnel peut refuser.
    """
    PENDING = "PENDING"        # Creee
    ACCEPTED = "ACCEPTED"      # Acceptee
    DECLINED = "DECLINED"      # Refusee
    IN_PROGRESS = "IN_PROGRESS"  # En cours
    COMPLETED = "COMPLETED"    # Terminee
    CANCELLED = "CANCELLED"    # Annulee par le client

    @property
    def label_fr(self) -> str:
        """Libelle francais du statut, pour l'affichage."""
        return {
            ServiceRequestStatus.PENDING: "Créée",
            ServiceRequestStatus.ACCEPTED: "Acceptée",
            ServiceRequestStatus.DECLINED: "Refusée",
            ServiceRequestStatus.IN_PROGRESS: "En cours",
            ServiceRequestStatus.COMPLETED: "Terminée",
            ServiceRequestStatus.CANCELLED: "Annulée",
        }[self]


class ReportTargetType(str, enum.Enum):
    """Type d'objet vise par un signalement.

    Reprend les motifs du cahier des charges (prix incorrect, produit
    indisponible, boutique fermee, faux professionnel, contenu abusif...).
    """
    PRICE = "PRICE"
    PRODUCT = "PRODUCT"
    STORE = "STORE"
    PROFESSIONAL = "PROFESSIONAL"
    SERVICE = "SERVICE"
    REVIEW = "REVIEW"
    USER = "USER"


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