"""alertes de prix

Revision ID: 196567c15ad7
Revises: 76cee8cd65fa
Create Date: 2026-09-09 11:56:23.980836

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '196567c15ad7'
down_revision: Union[str, None] = '76cee8cd65fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Ajoute la table des alertes de prix (P1)."""
    op.create_table(
        "price_alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("target_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("triggered", sa.Boolean(), nullable=False),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "product_id", name="uq_price_alert_user_product"),
    )
    op.create_index(
        op.f("ix_price_alerts_product_id"),
        "price_alerts",
        ["product_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_price_alerts_user_id"),
        "price_alerts",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    """Retire la table des alertes de prix."""
    op.drop_index(op.f("ix_price_alerts_user_id"), table_name="price_alerts")
    op.drop_index(op.f("ix_price_alerts_product_id"), table_name="price_alerts")
    op.drop_table("price_alerts")