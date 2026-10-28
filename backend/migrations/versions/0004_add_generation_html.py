"""add html output to generations

Revision ID: 0004_add_generation_html
Revises: 0003_scope_generation_request_id
Create Date: 2026-10-28
"""

import sqlalchemy as sa
from alembic import op

revision = "0004_add_generation_html"
down_revision = "0003_scope_generation_request_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("generation", sa.Column("html", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("generation", "html")
