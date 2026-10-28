"""add generation error code

Revision ID: 0005_add_generation_error_code
Revises: 0004_add_generation_html
Create Date: 2026-10-28
"""

import sqlalchemy as sa
from alembic import op

revision = "0005_add_generation_error_code"
down_revision = "0004_add_generation_html"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("generation", sa.Column("error_code", sa.String(length=60), nullable=True))


def downgrade() -> None:
    op.drop_column("generation", "error_code")
