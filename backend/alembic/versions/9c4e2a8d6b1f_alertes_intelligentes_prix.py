"""alertes intelligentes: abonnement aux changements de prix

Revision ID: 9c4e2a8d6b1f
Revises: 5d1a7c9e3b80
Create Date: 2026-09-14 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9c4e2a8d6b1f'
down_revision: Union[str, None] = '5d1a7c9e3b80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column(
            'notify_price_changes',
            sa.Boolean(),
            nullable=False,
            server_default=sa.text('1'),
        ),
    )


def downgrade() -> None:
    op.drop_column('users', 'notify_price_changes')