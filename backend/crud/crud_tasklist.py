from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from fastapi import HTTPException, status
from ..models import TaskList
from ..schemas.schemas_tasklist import TaskListResponse
import logging

logger = logging.getLogger(__name__)

async def get_task_lists(db: AsyncSession) -> List[TaskListResponse]:
    """
    Obtiene todas las actividades disponibles.
    """
    try:
        query = select(TaskList)
        result = await db.execute(query)
        tasks = result.scalars().all()

        task_responses = [TaskListResponse.model_validate(task) for task in tasks]
        return task_responses

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener actividades: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al obtener las actividades")
    
async def get_task_lists_by_type(db: AsyncSession, task_type: str) -> List[TaskListResponse]:
    """Obtiene actividades filtradas por tipo."""
    try:
        query = select(TaskList).where(TaskList.task_type == task_type)
        result = await db.execute(query)
        tasks = result.scalars().all()

        task_responses = [TaskListResponse.model_validate(task) for task in tasks]
        return task_responses

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener actividades de tipo {task_type}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al obtener actividades de tipo {task_type}")