"""client features (confirmation prix, report generique, categories type, statut IN_PROGRESS)

Revision ID: e7a89f8d484b
Revises: f35557f93fa6
Create Date: 2026-09-08 21:33:07.463253

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e7a89f8d484b'
down_revision: Union[str, None] = 'f35557f93fa6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Enums declares dans app.models.enums.
categorytype = sa.Enum('PRODUCT', 'SERVICE', name='categorytype')
reporttargettype = sa.Enum(
    'PRICE', 'PRODUCT', 'STORE', 'PROFESSIONAL', 'SERVICE', 'REVIEW', 'USER',
    name='reporttargettype',
)
servicerequeststatus = sa.Enum(
    'PENDING', 'ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
    name='servicerequeststatus',
)


def upgrade() -> None:
    # Les colonnes NOT NULL ajoutees portent un server_default temporaire pour
    # rester valides sur une base deja peuplee (notamment SQLite). Le defaut
    # est retire a la fin car il ne fait pas partie du modele.
    with op.batch_alter_table('categories') as batch:
        batch.add_column(
            sa.Column('type', categorytype, nullable=False, server_default='PRODUCT')
        )

    with op.batch_alter_table('stores') as batch:
        batch.add_column(
            sa.Column(
                'is_verified', sa.Boolean(), nullable=False, server_default=sa.false()
            )
        )

    with op.batch_alter_table('prices') as batch:
        batch.add_column(
            sa.Column(
                'confirmed_count', sa.Integer(), nullable=False, server_default='0'
            )
        )
        batch.add_column(
            sa.Column('last_confirmed_at', sa.DateTime(timezone=True), nullable=True)
        )

    # Signalements : cible generique (target_type + target_id) remplace price_id.
    with op.batch_alter_table('reports') as batch:
        batch.add_column(
            sa.Column(
                'target_type', reporttargettype,
                nullable=False, server_default='PRICE',
            )
        )
        batch.add_column(
            sa.Column(
                'target_id', sa.Integer(), nullable=False, server_default='0'
            )
        )
        batch.drop_index('ix_reports_price_id')
        batch.drop_column('price_id')
        batch.create_index('ix_reports_target_type', ['target_type'])
        batch.create_index('ix_reports_target_id', ['target_id'])

    # Statut de demande : nouvelle valeur IN_PROGRESS (workflow cahier des charges).
    with op.batch_alter_table('service_requests') as batch:
        batch.alter_column(
            'status',
            existing_type=sa.VARCHAR(length=9),
            type_=servicerequeststatus,
            existing_nullable=False,
            postgresql_using='status::servicerequeststatus',
        )

    # Retrait des server_default temporaires.
    with op.batch_alter_table('categories') as batch:
        batch.alter_column('type', existing_type=categorytype, server_default=None)
    with op.batch_alter_table('stores') as batch:
        batch.alter_column('is_verified', existing_type=sa.Boolean(), server_default=None)
    with op.batch_alter_table('prices') as batch:
        batch.alter_column(
            'confirmed_count', existing_type=sa.Integer(), server_default=None
        )
    with op.batch_alter_table('reports') as batch:
        batch.alter_column(
            'target_type', existing_type=reporttargettype, server_default=None
        )
        batch.alter_column(
            'target_id', existing_type=sa.Integer(), server_default=None
        )


def downgrade() -> None:
    with op.batch_alter_table('stores') as batch:
        batch.drop_column('is_verified')

    with op.batch_alter_table('service_requests') as batch:
        batch.alter_column(
            'status',
            existing_type=servicerequeststatus,
            type_=sa.VARCHAR(length=9),
            existing_nullable=False,
        )

    with op.batch_alter_table('reports') as batch:
        batch.drop_index('ix_reports_target_type')
        batch.drop_index('ix_reports_target_id')
        batch.drop_column('target_id')
        batch.drop_column('target_type')
        batch.add_column(sa.Column('price_id', sa.Integer(), nullable=True))
        batch.create_index('ix_reports_price_id', ['price_id'])
        batch.create_foreign_key(None, 'prices', ['price_id'], ['id'], ondelete='SET NULL')

    with op.batch_alter_table('prices') as batch:
        batch.drop_column('last_confirmed_at')
        batch.drop_column('confirmed_count')

    with op.batch_alter_table('categories') as batch:
        batch.drop_column('type')