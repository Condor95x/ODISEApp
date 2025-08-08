from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import logging
from ..database import get_db  # Importación añadida
from models import Vineyard  # Importación añadida
from schemas.schemas_vineyard import VineyardResponse  # Importación añadida
from crud .crud_vineyard import get_all_vineyards, get_management, get_conduction  # Importación añadida

router = APIRouter(
    prefix="/vineyard",
    tags=["vineyard"]
)

logger = logging.getLogger(__name__)

@router.get("/", 
    response_model=List[VineyardResponse],
    description="Obtiene todos los registros de vineyard")
async def read_all_vineyards(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_all_vineyards(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener vineyard: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los registros"
        )

@router.get("/management", 
    response_model=List[VineyardResponse],
    description="Obtiene todas las variedades")
async def read_management(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_management(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener variedades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las variedades"
        )

@router.get("/conduction", 
    response_model=List[VineyardResponse],
    description="Obtiene todos los portainjertos")
async def read_conduction(
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_conduction(db)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener portainjertos: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los portainjertos"
        )
