from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from crud.crud_tasklist import get_task_lists, get_task_lists_by_type
from schemas.schemas_tasklist import TaskListResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/task", tags=["task"])

@router.get("/", 
            response_model=List[TaskListResponse],
            description="Obtiene la lista de todas las actividades disponibles")
async def read_task_lists(db: AsyncSession = Depends(get_db)):
    try:
        tasks = await get_task_lists(db)
        return tasks
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener la lista de actividades: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la lista de actividades"
        )

@router.get("/vineyard", 
            response_model=List[TaskListResponse],
            description="Obtiene la lista de actividades de tipo vineyard")
async def read_vineyard_tasks(db: AsyncSession = Depends(get_db)):
    try:
        tasks = await get_task_lists_by_type(db, "vineyard")
        return tasks
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener actividades de viñedo: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener actividades de viñedo"
        )

@router.get("/winery", 
            response_model=List[TaskListResponse],
            description="Obtiene la lista de actividades de tipo winery")
async def read_winery_tasks(db: AsyncSession = Depends(get_db)):
    try:
        tasks = await get_task_lists_by_type(db, "winery")
        return tasks
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener actividades de bodega: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener actividades de bodega"
        )
