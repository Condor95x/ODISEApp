from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.operaciones_schemas import (
    OperacionCreate, OperacionUpdate, OperacionResponse, 
    OperacionListItem, OperacionInputsUpdate
)
from ..crud.operaciones_crud import (
    create_operation_with_inputs,
    get_operaciones_optimized,
    get_operacion_detailed,
    get_vineyard_operaciones_optimized,
    get_winery_operaciones_optimized,
    update_operacion_optimized,
    update_operacion_inputs_optimized,
    delete_operacion_optimized
)
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=OperacionResponse, status_code=status.HTTP_201_CREATED)
async def create_operacion_endpoint(
    operacion: OperacionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Crear una nueva operación con sus insumos
    """
    try:
        return await create_operation_with_inputs(db, operacion)
    except Exception as e:
        logger.error(f"Error creando operación: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al crear la operación"
        )

@router.get("/", response_model=List[OperacionListItem])
async def read_operaciones(db: AsyncSession = Depends(get_db)):
    """
    Obtener todas las operaciones (vista optimizada para listados)
    """
    try:
        return await get_operaciones_optimized(db)
    except Exception as e:
        logger.error(f"Error obteniendo operaciones: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/vineyard", response_model=List[OperacionListItem])
async def read_vineyard_operaciones(db: AsyncSession = Depends(get_db)):
    """
    Obtener operaciones de viñedo (vista optimizada)
    """
    try:
        return await get_vineyard_operaciones_optimized(db)
    except Exception as e:
        logger.error(f"Error obteniendo operaciones de viñedo: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/winery", response_model=List[OperacionListItem])
async def read_winery_operaciones(db: AsyncSession = Depends(get_db)):
    """
    Obtener operaciones de bodega (vista optimizada)
    """
    try:
        return await get_winery_operaciones_optimized(db)
    except Exception as e:
        logger.error(f"Error obteniendo operaciones de bodega: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.get("/{operacion_id}", response_model=OperacionResponse)
async def read_operacion(operacion_id: int, db: AsyncSession = Depends(get_db)):
    """
    Obtener una operación específica con todos sus detalles
    """
    try:
        operacion = await get_operacion_detailed(db, operacion_id)
        if operacion is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Operación con ID {operacion_id} no encontrada"
            )
        return operacion
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error obteniendo operación {operacion_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor"
        )

@router.put("/{operacion_id}", response_model=OperacionResponse)
async def update_operacion_endpoint(
    operacion_id: int,
    operacion_update: OperacionUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar una operación existente
    """
    try:
        updated_operacion = await update_operacion_optimized(db, operacion_id, operacion_update)
        if updated_operacion is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Operación con ID {operacion_id} no encontrada"
            )
        return updated_operacion
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando operación {operacion_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al actualizar la operación"
        )

@router.put("/{operacion_id}/inputs", status_code=status.HTTP_200_OK)
async def update_operacion_inputs_endpoint(
    operacion_id: int,
    inputs_update: OperacionInputsUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Actualizar los insumos de una operación
    """
    try:
        # Verificar que la operación existe
        operacion = await get_operacion_detailed(db, operacion_id)
        if operacion is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Operación con ID {operacion_id} no encontrada"
            )
        
        success = await update_operacion_inputs_optimized(db, operacion_id, inputs_update.inputs)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error al actualizar los insumos"
            )
        
        return {"message": "Insumos actualizados correctamente", "operacion_id": operacion_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error actualizando inputs de operación {operacion_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al actualizar insumos"
        )

@router.delete("/{operacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operacion_endpoint(operacion_id: int, db: AsyncSession = Depends(get_db)):
    """
    Eliminar una operación y todos sus registros relacionados
    """
    logger.info(f"=== RECIBIDA PETICIÓN DELETE para operación ID: {operacion_id} ===")
    
    try:
        # Verificar que el ID es válido
        if operacion_id <= 0:
            logger.warning(f"ID inválido: {operacion_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ID de operación inválido: {operacion_id}"
            )
        
        # Verificar que la operación existe antes de intentar eliminarla
        operacion = await get_operacion_detailed(db, operacion_id)
        if operacion is None:
            logger.warning(f"Operación {operacion_id} no encontrada")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"Operación con ID {operacion_id} no encontrada"
            )
        
        logger.info(f"Operación encontrada: {operacion.tipo_operacion} - Eliminando...")
        
        # Proceder con la eliminación
        success = await delete_operacion_optimized(db, operacion_id)
        
        if not success:
            logger.error(f"Falló la eliminación de operación {operacion_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Error interno al eliminar la operación"
            )
        
        logger.info(f"=== OPERACIÓN {operacion_id} ELIMINADA EXITOSAMENTE ===")
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inesperado eliminando operación {operacion_id}: {type(e).__name__}: {e}")
        
        # Si es error de integridad, dar mensaje más específico
        if "ForeignKeyViolationError" in str(e) or "foreign key constraint" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No se puede eliminar la operación porque tiene registros relacionados"
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno del servidor al eliminar la operación"
        )
