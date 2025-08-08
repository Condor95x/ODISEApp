from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from fastapi import HTTPException
import logging
from ..models import Vineyard  # Importación añadida
from sqlalchemy.exc import SQLAlchemyError  # Importación añadida

logger = logging.getLogger(__name__)

async def get_all_vineyards(db: AsyncSession) -> List[Vineyard]:
    """
    Obtiene todos los registros de la tabla vineyards
    """
    try:
        query = select(Vineyard)
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:  # Excepción más específica
        logger.error(f"Error al obtener vineyards: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

async def get_management(db: AsyncSession) -> List[Vineyard]:
    """
    Obtiene todas las variedades (vy_id que inicia con 'MAN')
    """
    try:
        query = select(Vineyard).where(Vineyard.vy_id.like('MAN%'))
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener variedades: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

async def get_conduction(db: AsyncSession) -> List[Vineyard]:
    """
    Obtiene todos los portainjertos (vy_id que inicia con 'CON')
    """
    try:
        query = select(Vineyard).where(Vineyard.vy_id.like('CON%'))
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener portainjertos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

