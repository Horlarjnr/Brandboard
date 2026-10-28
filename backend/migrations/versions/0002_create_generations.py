"""create generation table

Revision ID: 0002_create_generations
Revises: 0001_create_projects
Create Date: 2026-10-28
"""

import sqlalchemy as sa
from alembic import op

revision = "0002_create_generations"
down_revision = "0001_create_projects"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "generation",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("request_id", sa.String(length=120), nullable=False),
        sa.Column("prompt", sa.String(length=2000), nullable=False),
        sa.Column("width", sa.Integer(), nullable=False, server_default="1080"),
        sa.Column("height", sa.Integer(), nullable=False, server_default="1080"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="queued"),
        sa.Column("step", sa.String(length=40), nullable=True),
        sa.Column("spec", sa.JSON(), nullable=True),
        sa.Column("svg", sa.Text(), nullable=True),
        sa.Column("model", sa.String(length=80), nullable=True),
        sa.Column("tokens_in", sa.Integer(), nullable=True),
        sa.Column("tokens_out", sa.Integer(), nullable=True),
        sa.Column("error", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["generation.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_generation_project_id", "generation", ["project_id"], unique=False)
    op.create_index("ix_generation_request_id", "generation", ["request_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_generation_request_id", table_name="generation")
    op.drop_index("ix_generation_project_id", table_name="generation")
    op.drop_table("generation")
