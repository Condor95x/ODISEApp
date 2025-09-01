"""Finca y sectores - Cambio del nombre de IDS

Revision ID: 9640cdd2b0d3
Revises: f0934145fda0
Create Date: 2025-08-30 08:44:29.927651

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '9640cdd2b0d3'
down_revision: Union[str, None] = 'f0934145fda0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PASO 1: Eliminar foreign keys que referencian las columnas que vamos a renombrar
    op.drop_constraint('plot_sector_id_fkey', 'plot', type_='foreignkey')
    op.drop_constraint('sectores_finca_id_fkey', 'sectores', type_='foreignkey')
    
    # PASO 2: Eliminar índices existentes
    op.drop_index('ix_finca_id', table_name='finca')
    op.drop_index('ix_sectores_id', table_name='sectores')
    
    # PASO 3: Renombrar las columnas de clave primaria
    op.alter_column('finca', 'id', new_column_name='finca_id')
    op.alter_column('sectores', 'id', new_column_name='sector_id')
    
    # PASO 4: Crear nuevos índices con los nombres correctos
    op.create_index(op.f('ix_finca_finca_id'), 'finca', ['finca_id'], unique=False)
    op.create_index(op.f('ix_sectores_sector_id'), 'sectores', ['sector_id'], unique=False)
    
    # PASO 5: Recrear las foreign keys con las nuevas referencias
    op.create_foreign_key(None, 'plot', 'sectores', ['sector_id'], ['sector_id'])
    op.create_foreign_key(None, 'sectores', 'finca', ['finca_id'], ['finca_id'])


def downgrade() -> None:
    # Revertir en orden inverso
    
    # PASO 1: Eliminar foreign keys
    op.drop_constraint(None, 'sectores', type_='foreignkey')
    op.drop_constraint(None, 'plot', type_='foreignkey')
    
    # PASO 2: Eliminar índices
    op.drop_index(op.f('ix_sectores_sector_id'), table_name='sectores')
    op.drop_index(op.f('ix_finca_finca_id'), table_name='finca')
    
    # PASO 3: Renombrar columnas de vuelta a su nombre original
    op.alter_column('sectores', 'sector_id', new_column_name='id')
    op.alter_column('finca', 'finca_id', new_column_name='id')
    
    # PASO 4: Recrear índices originales
    op.create_index('ix_sectores_id', 'sectores', ['id'], unique=False)
    op.create_index('ix_finca_id', 'finca', ['id'], unique=False)
    
    # PASO 5: Recrear foreign keys originales
    op.create_foreign_key('sectores_finca_id_fkey', 'sectores', 'finca', ['finca_id'], ['id'])
    op.create_foreign_key('plot_sector_id_fkey', 'plot', 'sectores', ['sector_id'], ['id'])