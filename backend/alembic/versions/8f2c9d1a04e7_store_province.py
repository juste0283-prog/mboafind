"""store province (Où trouver)

Revision ID: 8f2c9d1a04e7
Revises: 69ddbd3be722
Create Date: 2026-09-13 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8f2c9d1a04e7'
down_revision: Union[str, None] = '69ddbd3be722'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('stores', sa.Column('province', sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column('stores', 'province')