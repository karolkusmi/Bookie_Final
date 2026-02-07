"""add current_reading_isbn to user

Revision ID: add_current_reading_isbn
Revises: add_lat_lng_event
Create Date: 2026-02-06 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_current_reading_isbn'
down_revision = 'add_lat_lng_event'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('current_reading_isbn', sa.String(length=20), nullable=True))


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_column('current_reading_isbn')

