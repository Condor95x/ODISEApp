"""Merge heads

Revision ID: c71d5aeaaec0
Revises: 0e3ed19952cb, 4bb6f7d85909
Create Date: 2025-08-29 12:15:23.374910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = 'c71d5aeaaec0'
down_revision: Union[str, None] = ('0e3ed19952cb', '4bb6f7d85909')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
