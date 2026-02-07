"""add user profile prefs (about_text, favorite_genres)

Revision ID: add_user_profile_prefs
Revises: add_user_top3
Create Date: 2026-02-06

"""
from alembic import op
import sqlalchemy as sa


revision = "add_user_profile_prefs"
down_revision = "add_user_top3"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.add_column(sa.Column("about_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("favorite_genres", sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table("user", schema=None) as batch_op:
        batch_op.drop_column("favorite_genres")
        batch_op.drop_column("about_text")
