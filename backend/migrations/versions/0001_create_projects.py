"""create projects table

Revision ID: 0001_create_projects
Revises:
Create Date: 2026-10-28
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_create_projects"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "project",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=16), nullable=False),
        sa.Column("owner_token_hash", sa.String(length=64), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("colors", sa.JSON(), nullable=False),
        sa.Column("font", sa.String(length=80), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code"),
    )
    op.create_index("ix_project_code", "project", ["code"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_project_code", table_name="project")
    op.drop_table("project")
