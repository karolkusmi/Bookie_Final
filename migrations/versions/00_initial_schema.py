"""Initial schema: user, event, book, user_event, user_library

Creación inicial de tablas para bases de datos vacías (p. ej. Render).
La migración 59ce9fb7c64c asumía que estas tablas ya existían.

Revision ID: initial_schema
Revises:
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa


revision = "initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # book primero (user tiene FK a book en migraciones posteriores; aquí no)
    op.create_table(
        "book",
        sa.Column("isbn", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("author", sa.String(length=500), nullable=True),
        sa.Column("publisher", sa.String(length=50), nullable=True),
        sa.Column("thumbnail", sa.String(length=500), nullable=True),
        sa.PrimaryKeyConstraint("isbn"),
    )

    # user (estado antes de 59ce9fb7c64c: sin image_avatar)
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("email", sa.String(length=120), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("username"),
    )

    # event (estado antes de 59ce9fb7c64c: con created_by_id)
    op.create_table(
        "event",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=100), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("time", sa.Time(), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("location", sa.String(length=120), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_id"], ["user.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    # user_event (N:M user <-> event)
    op.create_table(
        "user_event",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["event_id"], ["event.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "event_id"),
    )

    # user_library (N:M user <-> book)
    op.create_table(
        "user_library",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("book_isbn", sa.String(length=20), nullable=False),
        sa.ForeignKeyConstraint(["book_isbn"], ["book.isbn"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "book_isbn"),
    )


def downgrade():
    op.drop_table("user_library")
    op.drop_table("user_event")
    op.drop_table("event")
    op.drop_table("user")
    op.drop_table("book")
