from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db  # Ajusta la ruta según tu estructura
from ..crud import crud_finca
from ..crud.crud_finca import FincaCreate, FincaUpdate, FincaResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/fincas",
    tags=["fincas"]
)

# POST - Crear nueva finca
@router.post("/", response_model=FincaResponse, status_code=status.HTTP_201_CREATED)
async def create_finca(
    finca: FincaCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Crear una nueva finca"""
    try:
        return await crud_finca.create_finca(db=db, finca=finca)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al crear finca: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al crear la finca"
        )

# GET - Obtener todas las fincas
@router.get("/", response_model=List[FincaResponse])
async def get_fincas(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Máximo número de registros a retornar"),
    db: AsyncSession = Depends(get_db)
):
    """Obtener lista de fincas con paginación"""
    try:
        return await crud_finca.get_fincas(db=db, skip=skip, limit=limit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener fincas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener las fincas"
        )

# GET - Obtener finca por ID
@router.get("/{finca_id}", response_model=FincaResponse)
async def get_finca(
    finca_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """Obtener una finca específica por ID"""
    try:
        return await crud_finca.get_finca(db=db, finca_id=finca_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al obtener finca {finca_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al obtener la finca"
        )

# PUT - Actualizar finca
@router.put("/{finca_id}", response_model=FincaResponse)
async def update_finca(
    finca_id: int,
    finca_update: FincaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Actualizar una finca existente"""
    try:
        return await crud_finca.update_finca(db=db, finca_id=finca_id, finca_update=finca_update)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al actualizar finca {finca_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al actualizar la finca"
        )

# DELETE - Eliminar finca
@router.delete("/{finca_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_finca(
    finca_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Eliminar una finca"""
    try:
        await crud_finca.delete_finca(db=db, finca_id=finca_id)
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al eliminar finca {finca_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al eliminar la finca"
        )

# GET - Buscar fincas
@router.get("/search/", response_model=List[FincaResponse])
async def search_fincas(
    q: str = Query(..., min_length=1, description="Término de búsqueda"),
    db: AsyncSession = Depends(get_db)
):
    """Buscar fincas por value o description"""
    try:
        return await crud_finca.search_fincas(db=db, search_term=q)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al buscar fincas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al buscar fincas"
        )

# GET - Contar fincas
@router.get("/statistics/count")
async def count_fincas(
    db: AsyncSession = Depends(get_db)
):
    """Obtener el total de fincas"""
    try:
        total = await crud_finca.count_fincas(db=db)
        return {"total_fincas": total}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al contar fincas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al contar fincas"
        )