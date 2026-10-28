"""scope generation request IDs to projects

Revision ID: 0003_scope_generation_request_id
Revises: 0002_create_generations
Create Date: 2026-10-28
"""

from alembic import op

revision = "0003_scope_generation_request_id"
down_revision = "0002_create_generations"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("ix_generation_request_id", table_name="generation")
    op.create_index(
        "ix_generation_project_request_id",
        "generation",
        ["project_id", "request_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_generation_project_request_id", table_name="generation")
    op.create_index("ix_generation_request_id", "generation", ["request_id"], unique=True)
