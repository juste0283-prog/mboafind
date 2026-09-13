"""service express: priorite et echeance des demandes

Revision ID: 5d1a7c9e3b80
Revises: 8f2c9d1a04e7
Create Date: 2026-09-13 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d1a7c9e3b80'
down_revision: Union[str, None] = '8f2c9d1a04e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'service_requests',
        sa.Column(
            'priority',
            sa.Enum('NORMAL', 'EXPRESS', name='servicerequestpriority'),
            nullable=False,
            server_default='NORMAL',
        ),
    )
    op.add_column(
        'service_requests',
        sa.Column('requested_deadline', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('service_requests', 'requested_deadline')
    op.drop_column('service_requests', 'priority')