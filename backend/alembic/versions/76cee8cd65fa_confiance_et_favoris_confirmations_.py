"""confiance et favoris : confirmations idempotentes, historique prix, favoris, moderation admin

Revision ID: 76cee8cd65fa
Revises: e7a89f8d484b
Create Date: 2026-09-09 07:57:12.557987

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76cee8cd65fa'
down_revision: Union[str, None] = 'e7a89f8d484b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajoute les tables de confiance (Prix reel) et des favoris.

    - price_confirmations : une confirmation unique par (client, prix).
    - price_histories : anciennes valeurs d'une offre de prix.
    - favorites : produits / boutiques / professionnels sauvegardes.
    """
    op.create_table(
        "price_confirmations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("price_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["price_id"], ["prices.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("price_id", "user_id", name="uq_price_confirmation_user"),
    )
    op.create_index(
        op.f("ix_price_confirmations_price_id"),
        "price_confirmations",
        ["price_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_price_confirmations_user_id"),
        "price_confirmations",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "price_histories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("price_id", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.Column("changed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["price_id"], ["prices.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_price_histories_changed_at"),
        "price_histories",
        ["changed_at"],
        unique=False,
    )
    op.create_index(
        op.f("ix_price_histories_price_id"),
        "price_histories",
        ["price_id"],
        unique=False,
    )

    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("item_type", sa.String(length=12), nullable=False),
        sa.Column("item_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "item_type", "item_id", name="uq_favorite_user_item"),
    )
    op.create_index(
        op.f("ix_favorites_item_id"),
        "favorites",
        ["item_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_favorites_item_type"),
        "favorites",
        ["item_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_favorites_user_id"),
        "favorites",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Retire les tables ajoutees."""
    op.drop_index(op.f("ix_favorites_user_id"), table_name="favorites")
    op.drop_index(op.f("ix_favorites_item_type"), table_name="favorites")
    op.drop_index(op.f("ix_favorites_item_id"), table_name="favorites")
    op.drop_table("favorites")
    op.drop_index(op.f("ix_price_histories_price_id"), table_name="price_histories")
    op.drop_index(op.f("ix_price_histories_changed_at"), table_name="price_histories")
    op.drop_table("price_histories")
    op.drop_index(op.f("ix_price_confirmations_user_id"), table_name="price_confirmations")
    op.drop_index(op.f("ix_price_confirmations_price_id"), table_name="price_confirmations")
    op.drop_table("price_confirmations")