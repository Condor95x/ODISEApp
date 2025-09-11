from ..models import Operacion, TaskInput, InputStock, TaskList, Plot, InventoryMovement
from ..schemas.operaciones_schemas import (
    OperacionCreate, OperacionUpdate, OperacionResponse, 
    OperacionListItem, TaskInputUpdate, TaskInputCreate
)
from ..schemas.schemas_plot import PlotForOPS
from .crud_inventory import create_inventory_movement
from sqlalchemy import delete, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload, joinedload
from typing import List, Optional
from fastapi import HTTPException
from datetime import datetime
from ..schemas.schemas_inventory import InventoryMovementCreate
import logging

logger = logging.getLogger(__name__)

async def create_operation_with_inputs(
    db: AsyncSession,
    operation: OperacionCreate
) -> OperacionResponse:
    """
    Crea una operación con sus insumos de forma optimizada
    """
    try:
        # Crear la operación principal
        db_operation = Operacion(
            parcela_id=operation.parcela_id,
            tipo_operacion=operation.tipo_operacion,
            fecha_inicio=operation.fecha_inicio,
            fecha_fin=operation.fecha_fin,
            estado=operation.estado or "planned",
            responsable_id=operation.responsable_id,
            nota=operation.nota or "",
            comentario=operation.comentario or ""
        )

        db.add(db_operation)
        await db.flush()  # Obtener el ID sin hacer commit
        
        # Procesar insumos si existen
        task_inputs = []
        if operation.inputs:
            for input_data in operation.inputs:
                # Crear movimiento de inventario
                movement = InventoryMovementCreate(
                    input_id=input_data.input_id,
                    warehouse_id=input_data.warehouse_id,
                    quantity=input_data.used_quantity,
                    movement_type="exit",
                    movement_date=datetime.now(),
                    operation_id=db_operation.id,
                    description=f"Consumo para operación {db_operation.id}"
                )
                await create_inventory_movement(db, movement)

                # Crear TaskInput
                db_task_input = TaskInput(
                    input_id=input_data.input_id,
                    used_quantity=input_data.used_quantity,
                    warehouse_id=input_data.warehouse_id,
                    status=input_data.status or "planned",
                    operation_id=db_operation.id
                )
                db.add(db_task_input)
                task_inputs.append(db_task_input)

        await db.commit()
        
        # Obtener información de la parcela
        plot_result = await db.execute(
            select(Plot.plot_id, Plot.plot_name)
            .where(Plot.plot_id == operation.parcela_id)
        )
        plot_data = plot_result.first()
        
        return OperacionResponse(
            id=db_operation.id,
            parcela_id=db_operation.parcela_id,
            tipo_operacion=db_operation.tipo_operacion,
            fecha_inicio=db_operation.fecha_inicio,
            fecha_fin=db_operation.fecha_fin,
            estado=db_operation.estado,
            responsable_id=db_operation.responsable_id,
            nota=db_operation.nota,
            comentario=db_operation.comentario,
            inputs=[
                {
                    "id": ti.id,
                    "input_id": ti.input_id,
                    "used_quantity": ti.used_quantity,
                    "warehouse_id": ti.warehouse_id,
                    "status": ti.status,
                    "operation_id": ti.operation_id,
                    "planned_quantity": ti.planned_quantity  # Agregar este campo
                } for ti in task_inputs
            ],
            parcela=PlotForOPS(
                plot_id=plot_data.plot_id,
                plot_name=plot_data.plot_name
            ) if plot_data else None
        )

    except Exception as e:
        logger.error(f"Error creando operación: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear operación: {str(e)}")

async def get_operaciones_optimized(db: AsyncSession) -> List[OperacionListItem]:
    """
    Obtiene todas las operaciones con información optimizada para listados
    """
    result = await db.execute(
        select(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name.label("parcela_name"),
            Operacion.estado,
            Operacion.fecha_inicio,
            Operacion.responsable_id,
            Operacion.creation_date,
            Operacion.jornales,
            Operacion.personas,
            Operacion.porcentaje_avance,
            func.count(TaskInput.id).label("inputs_count")
        )
        .outerjoin(Plot, Operacion.parcela_id == Plot.plot_id)
        .outerjoin(TaskInput, Operacion.id == TaskInput.operation_id)
        .group_by(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name,
            Operacion.estado,
            Operacion.fecha_inicio,
            Operacion.responsable_id,
            Operacion.creation_date,
            Operacion.jornales,
            Operacion.personas,
            Operacion.porcentaje_avance
        )
        .order_by(Operacion.creation_date.desc())  # Más recientes primero
    )
    
    operaciones_data = result.all()
    return [
        OperacionListItem(
            id=row.id,
            tipo_operacion=row.tipo_operacion,
            parcela_id=row.parcela_id,
            parcela_name=row.parcela_name,
            estado=row.estado,
            fecha_inicio=row.fecha_inicio,
            responsable_id=row.responsable_id,
            creation_date=row.creation_date,
            jornales=row.jornales,
            personas=row.personas,
            porcentaje_avance=row.porcentaje_avance,
            inputs_count=row.inputs_count
        )
        for row in operaciones_data
    ]

async def get_operacion_detailed(db: AsyncSession, operacion_id: int) -> Optional[OperacionResponse]:
    """
    Obtiene una operación específica con todos sus detalles
    """
    result = await db.execute(
        select(Operacion)
        .options(selectinload(Operacion.inputs))
        .where(Operacion.id == operacion_id)
    )
    
    operacion = result.scalar_one_or_none()
    if not operacion:
        return None
    
    # Obtener información de la parcela
    plot_result = await db.execute(
        select(Plot.plot_id, Plot.plot_name)
        .where(Plot.plot_id == operacion.parcela_id)
    )
    plot_data = plot_result.first()
    
    return OperacionResponse(
        id=operacion.id,
        parcela_id=operacion.parcela_id,
        tipo_operacion=operacion.tipo_operacion,
        fecha_inicio=operacion.fecha_inicio,
        fecha_fin=operacion.fecha_fin,
        estado=operacion.estado,
        responsable_id=operacion.responsable_id,
        jornales=operacion.jornales,
        personas=operacion.personas,
        porcentaje_avance=operacion.porcentaje_avance,
        nota=operacion.nota,
        comentario=operacion.comentario,
        inputs=[
            {
                "id": inp.id,
                "input_id": inp.input_id,
                "used_quantity": inp.used_quantity,
                "warehouse_id": inp.warehouse_id,
                "status": inp.status,
                "operation_id": inp.operation_id
            }
            for inp in operacion.inputs
        ],
        parcela=PlotForOPS(
            plot_id=plot_data.plot_id,
            plot_name=plot_data.plot_name
        ) if plot_data else None
    )

async def get_vineyard_operaciones_optimized(db: AsyncSession) -> List[OperacionListItem]:
    """
    Obtiene operaciones de viñedo optimizadas para listados
    """
    result = await db.execute(
        select(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name.label("parcela_name"),
            Operacion.estado,
            Operacion.jornales,
            Operacion.personas,
            Operacion.porcentaje_avance,
            Operacion.fecha_inicio,
            Operacion.creation_date,
            Operacion.responsable_id,
            func.count(TaskInput.id).label("inputs_count")
        )
        .join(TaskList, Operacion.tipo_operacion == TaskList.task_name)
        .outerjoin(Plot, Operacion.parcela_id == Plot.plot_id)
        .outerjoin(TaskInput, Operacion.id == TaskInput.operation_id)
        .where(TaskList.task_type == "vineyard")
        .group_by(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name,
            Operacion.estado,
            Operacion.jornales,
            Operacion.personas,
            Operacion.porcentaje_avance,
            Operacion.fecha_inicio,
            Operacion.creation_date,
            Operacion.responsable_id
        )
    )
    
    operaciones_data = result.all()
    return [
        OperacionListItem(
            id=row.id,
            tipo_operacion=row.tipo_operacion,
            parcela_id=row.parcela_id,
            parcela_name=row.parcela_name,
            estado=row.estado,
            jornales=row.jornales,
            personas=row.personas,
            porcentaje_avance=row.porcentaje_avance,
            creation_date=row.creation_date,
            fecha_inicio=row.fecha_inicio,
            responsable_id=row.responsable_id,
            inputs_count=row.inputs_count
        )
        for row in operaciones_data
    ]

async def get_winery_operaciones_optimized(db: AsyncSession) -> List[OperacionListItem]:
    """
    Obtiene operaciones de bodega optimizadas para listados
    """
    result = await db.execute(
        select(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name.label("parcela_name"),
            Operacion.estado,
            Operacion.fecha_inicio,
            Operacion.responsable_id,
            func.count(TaskInput.id).label("inputs_count")
        )
        .join(TaskList, Operacion.tipo_operacion == TaskList.task_name)
        .outerjoin(Plot, Operacion.parcela_id == Plot.plot_id)
        .outerjoin(TaskInput, Operacion.id == TaskInput.operation_id)
        .where(TaskList.task_type == "winery")
        .group_by(
            Operacion.id,
            Operacion.tipo_operacion,
            Operacion.parcela_id,
            Plot.plot_name,
            Operacion.estado,
            Operacion.fecha_inicio,
            Operacion.responsable_id
        )
    )
    
    operaciones_data = result.all()
    return [
        OperacionListItem(
            id=row.id,
            tipo_operacion=row.tipo_operacion,
            parcela_id=row.parcela_id,
            parcela_name=row.parcela_name,
            estado=row.estado,
            fecha_inicio=row.fecha_inicio,
            responsable_id=row.responsable_id,
            inputs_count=row.inputs_count
        )
        for row in operaciones_data
    ]

async def update_operacion_optimized(
    db: AsyncSession, 
    operacion_id: int, 
    operacion_update: OperacionUpdate
) -> Optional[OperacionResponse]:
    """
    Actualiza una operación de forma optimizada
    """
    existing_operacion = await db.get(Operacion, operacion_id)
    if not existing_operacion:
        return None

    # Actualizar solo campos que no son None
    update_data = operacion_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(existing_operacion, key, value)

    await db.commit()
    
    # Retornar la operación actualizada con detalles completos
    return await get_operacion_detailed(db, operacion_id)

async def update_operacion_inputs_optimized(
    db: AsyncSession, 
    operacion_id: int, 
    inputs_data: List[TaskInputUpdate]
) -> bool:
    """
    Actualiza los insumos de una operación de forma optimizada
    """
    try:
        # Eliminar insumos existentes
        await db.execute(
            delete(TaskInput).where(TaskInput.operation_id == operacion_id)
        )
        
        # Agregar nuevos insumos
        for input_item in inputs_data:
            new_input = TaskInput(
                operation_id=operacion_id,
                input_id=input_item.input_id,
                used_quantity=input_item.used_quantity,
                warehouse_id=7,  # Valor por defecto
                status="planned"
            )
            db.add(new_input)
        
        await db.commit()
        return True
        
    except Exception as e:
        logger.error(f"Error actualizando inputs: {e}")
        await db.rollback()
        return False

async def delete_operacion_optimized(db: AsyncSession, operacion_id: int) -> bool:
    """
    Elimina una operación y sus registros relacionados de forma segura
    """
    try:
        logger.info(f"[CRUD] Iniciando eliminación de operación ID: {operacion_id}")
        
        # Verificar que la operación existe
        result = await db.execute(
            select(Operacion).where(Operacion.id == operacion_id)
        )
        operacion = result.scalar_one_or_none()
        
        if not operacion:
            logger.warning(f"[CRUD] Operación {operacion_id} no encontrada")
            return False

        logger.info(f"[CRUD] Operación encontrada - Tipo: {operacion.tipo_operacion}")

        # PASO 1: Verificar movimientos de inventario relacionados
        inventory_result = await db.execute(
            select(func.count()).select_from(InventoryMovement)
            .where(InventoryMovement.operation_id == operacion_id)
        )
        inventory_count = inventory_result.scalar()
        logger.info(f"[CRUD] Encontrados {inventory_count} movimientos de inventario asociados")

        # PASO 2: Eliminar movimientos de inventario primero
        if inventory_count > 0:
            logger.info(f"[CRUD] Eliminando {inventory_count} movimientos de inventario...")
            await db.execute(
                delete(InventoryMovement).where(InventoryMovement.operation_id == operacion_id)
            )
            logger.info("[CRUD] Movimientos de inventario eliminados")

        # PASO 3: Verificar TaskInputs relacionados
        task_inputs_result = await db.execute(
            select(func.count()).select_from(TaskInput)
            .where(TaskInput.operation_id == operacion_id)
        )
        task_inputs_count = task_inputs_result.scalar()
        logger.info(f"[CRUD] Encontrados {task_inputs_count} task inputs asociados")

        # PASO 4: Eliminar TaskInputs si existen
        if task_inputs_count > 0:
            logger.info(f"[CRUD] Eliminando {task_inputs_count} task inputs...")
            await db.execute(
                delete(TaskInput).where(TaskInput.operation_id == operacion_id)
            )
            logger.info("[CRUD] Task inputs eliminados")

        # PASO 5: Finalmente eliminar la operación
        logger.info(f"[CRUD] Eliminando la operación {operacion_id}...")
        await db.delete(operacion)
        
        # PASO 6: Commit de todos los cambios
        await db.commit()
        
        logger.info(f"[CRUD] Operación {operacion_id} eliminada exitosamente con todos sus registros relacionados")
        return True

    except Exception as e:
        logger.error(f"[CRUD] Error eliminando operación {operacion_id}: {type(e).__name__}: {e}")
        await db.rollback()
        return False

# Funciones de compatibilidad hacia atrás (si necesitas mantenerlas)
async def get_operaciones(db: AsyncSession):
    """Función de compatibilidad - usa la versión optimizada"""
    return await get_operaciones_optimized(db)

async def get_operacion(db: AsyncSession, id: int):
    """Función de compatibilidad - usa la versión optimizada"""
    return await get_operacion_detailed(db, id)

async def get_vineyard_operaciones(db: AsyncSession):
    """Función de compatibilidad - usa la versión optimizada"""
    return await get_vineyard_operaciones_optimized(db)

async def get_winery_operaciones(db: AsyncSession):
    """Función de compatibilidad - usa la versión optimizada"""
    return await get_winery_operaciones_optimized(db)