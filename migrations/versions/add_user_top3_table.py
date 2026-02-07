"""add user_top3 table

Revision ID: add_user_top3
Revises: add_current_reading_isbn
Create Date: 2026-02-06 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "add_user_top3"
down_revision = "add_current_reading_isbn"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_top3",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("book_isbn", sa.String(length=20), nullable=True),
        sa.ForeignKeyConstraint(["book_isbn"], ["book.isbn"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "position"),
    )


def downgrade():
    op.drop_table("user_top3")
