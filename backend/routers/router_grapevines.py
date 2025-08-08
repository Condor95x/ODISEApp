from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging
from ..database import get_db  # Importación añadida
from models import Grapevine  # Importación añadida
from schemas.schemas_grapevines import GrapevineResponse  # Importación añadida
from crud  .crud_grapevines import get_all_grapevines, get_varieties, get_rootstocks  # Importación añadida

router = APIRouter(
    prefix="/grapevines",
    tags=["grapevines"]
)

logger = logging.getLogger(__name__)

@router.get("/", 
    response_model=List[GrapevineResponse],
    description="Obtiene todos los registros de grapevines")
async def read_all_grapevines(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_all_grapevines(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener grapevines: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los registros"
        )

@router.get("/varieties", 
    response_model=List[GrapevineResponse],
    description="Obtiene todas las variedades")
async def read_varieties(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_varieties(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener variedades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las variedades"
        )

@router.get("/rootstocks", 
    response_model=List[GrapevineResponse],
    description="Obtiene todos los portainjertos")
async def read_rootstocks(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_rootstocks(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener portainjertos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los portainjertos"
        )
