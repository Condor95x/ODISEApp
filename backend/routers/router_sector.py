from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db  # Ajusta la ruta según tu estructura
from ..crud import crud_sector
from ..crud.crud_sector import SectorCreate, SectorUpdate, SectorResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sectores",
    tags=["sectores"]
)

# POST - Crear nuevo sector
@router.post("/", response_model=SectorResponse, status_code=status.HTTP_201_CREATED)
async def create_sector(
    sector: SectorCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Crear un nuevo sector"""
    try:
        return await crud_sector.create_sector(db=db, sector=sector)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear sector: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al crear el sector"
        )

# GET - Obtener todos los sectores
@router.get("/", response_model=List[SectorResponse])
async def get_sectores(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Máximo número de registros a retornar"),
    db: AsyncSession = Depends(get_db)
):
    """Obtener lista de sectores con paginación"""
    try:
        return await crud_sector.get_sectores(db=db, skip=skip, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener sectores: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener los sectores"
        )

# GET - Obtener sector por ID
@router.get("/{sector_id}", response_model=SectorResponse)
async def get_sector(
    sector_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """Obtener un sector específico por ID"""
    try:
        return await crud_sector.get_sector(db=db, sector_id=sector_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener sector {sector_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener el sector"
        )

# GET - Obtener sectores por finca
@router.get("/finca/{finca_id}", response_model=List[SectorResponse])
async def get_sectores_by_finca(
    finca_id: int = Path(..., description="ID de la finca"),
    db: AsyncSession = Depends(get_db)
):
    """Obtener todos los sectores de una finca específica"""
    try:
        return await crud_sector.get_sectores_by_finca(db=db, finca_id=finca_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener sectores de finca {finca_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener los sectores de la finca"
        )

# PUT - Actualizar sector
@router.put("/{sector_id}", response_model=SectorResponse)
async def update_sector(
    sector_id: int,
    sector_update: SectorUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualizar un sector existente"""
    try:
        return await crud_sector.update_sector(db=db, sector_id=sector_id, sector_update=sector_update)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar sector {sector_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al actualizar el sector"
        )

# DELETE - Eliminar sector
@router.delete("/{sector_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sector(
    sector_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Eliminar un sector"""
    try:
        await crud_sector.delete_sector(db=db, sector_id=sector_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar sector {sector_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al eliminar el sector"
        )

# GET - Buscar sectores
@router.get("/search/", response_model=List[SectorResponse])
async def search_sectores(
    q: str = Query(..., min_length=1, description="Término de búsqueda"),
    db: AsyncSession = Depends(get_db)
):
    """Buscar sectores por value, description o etiqueta"""
    try:
        return await crud_sector.search_sectores(db=db, search_term=q)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al buscar sectores: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al buscar sectores"
        )

# GET - Contar sectores por finca
@router.get("/finca/{finca_id}/count")
async def count_sectores_by_finca(
    finca_id: int = Path(..., description="ID de la finca"),
    db: AsyncSession = Depends(get_db)
):
    """Contar sectores de una finca específica"""
    try:
        count = await crud_sector.count_sectores_by_finca(db=db, finca_id=finca_id)
        return {"finca_id": finca_id, "total_sectores": count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al contar sectores de finca {finca_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al contar sectores"
        )

# GET - Contar todos los sectores
@router.get("/statistics/count")
async def count_sectores(
    db: AsyncSession = Depends(get_db)
):
    """Obtener el total de sectores"""
    try:
        total = await crud_sector.count_sectores(db=db)
        return {"total_sectores": total}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al contar sectores: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al contar sectores"
        )