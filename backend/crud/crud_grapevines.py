from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from fastapi import HTTPException
import logging
from ..models import Grapevine  # Importación añadida
from sqlalchemy.exc import SQLAlchemyError  # Importación añadida

logger = logging.getLogger(__name__)

async def get_all_grapevines(db: AsyncSession) -> List[Grapevine]:
    """
    Obtiene todos los registros de la tabla grapevines
    """
    try:
        query = select(Grapevine)
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:  # Excepción más específica
        logger.error(f"Error al obtener grapevines: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

async def get_varieties(db: AsyncSession) -> List[Grapevine]:
    """
    Obtiene todas las variedades (gv_id que inicia con 'V')
    """
    try:
        query = select(Grapevine).where(Grapevine.gv_id.like('V%'))
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener variedades: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

async def get_rootstocks(db: AsyncSession) -> List[Grapevine]:
    """
    Obtiene todos los portainjertos (gv_id que inicia con 'PI')
    """
    try:
        query = select(Grapevine).where(Grapevine.gv_id.like('PI%'))
        result = await db.execute(query)
        return result.scalars().all()
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener portainjertos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
