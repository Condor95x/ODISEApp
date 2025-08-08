from ..models import Operacion, TaskInput, InputStock, TaskList
from ..schemas.operaciones_schemas import OperacionCreate, OperacionUpdate, OperacionResponse, TaskInputUpdate
from .crud_inventory import create_inventory_movement
from passlib.context import CryptContext
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Dict, Any
from fastapi import HTTPException
from datetime import datetime
from ..schemas.schemas_inventory import InventoryMovementCreate, TaskInputCreate
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")  # Para encriptar contraseñas


async def create_operacion(db: AsyncSession, operacion: OperacionCreate):
    db_operaciones = Operacion(parcela_id=operacion.parcela_id,tipo_operacion=operacion.tipo_operacion,fecha_inicio=operacion.fecha_inicio,fecha_fin=operacion.fecha_fin,estado=operacion.estado,responsable_id=operacion.responsable_id,nota=operacion.nota,comentario=operacion.comentario)
    db.add(db_operaciones)
    await db.commit()
    await db.refresh(db_operaciones)
    return {"status": 201, "message": "Added successfully"}

async def get_operaciones(db: AsyncSession):
    """Obtiene todas las operaciones cargando también la relación de inputs."""
    result = await db.execute(select(Operacion).options(selectinload(Operacion.inputs)))
    operaciones = result.scalars().all()
    return operaciones

async def get_operacion(db: AsyncSession, id: int):
    """Obtiene una operación por su ID cargando también la relación de inputs."""
    result = await db.execute(select(Operacion).where(Operacion.id == id).options(selectinload(Operacion.inputs)))
    operacion_db = result.scalars().first()
    return operacion_db

async def get_vineyard_operaciones(db: AsyncSession):
    """Obtiene todas las operaciones de tipo 'vineyard' cargando también la relación de inputs."""
    result = await db.execute(
        select(Operacion)
        .join(TaskList, Operacion.tipo_operacion == TaskList.task_name)
        .where(TaskList.task_type == "vineyard")
        .options(selectinload(Operacion.inputs))
    )
    operaciones = result.scalars().all()
    return operaciones

async def get_winery_operaciones(db: AsyncSession):
    """Obtiene todas las operaciones de tipo 'winery' cargando también la relación de inputs."""
    result = await db.execute(
        select(Operacion)
        .join(TaskList, Operacion.tipo_operacion == TaskList.task_name)
        .where(TaskList.task_type == "winery")
        .options(selectinload(Operacion.inputs))
    )
    operaciones = result.scalars().all()
    return operaciones

async def update_operacion(db: AsyncSession, operacion_id: int, parcela_update: OperacionUpdate):
    existing_operacion = await db.get(Operacion, operacion_id)
    if existing_operacion is None:
        return None # Retorna None si no existe

    for key, value in parcela_update.dict(exclude_unset=True).items():
        setattr(existing_operacion,key,value)

    await db.commit()
    await db.refresh(existing_operacion)
    return existing_operacion # Retorna el modelo actualizado

async def delete_operacion(db: AsyncSession, operacion_id: int):
    operacion = await db.get(Operacion, operacion_id)
    if operacion is None:
        return False  # Indica que no se encontró la parcela
    await db.delete(operacion)
    await db.commit()
    return True  # Indica que la eliminación fue exitosa

async def create_operation_with_inputs(
    db: AsyncSession,
    operation: OperacionCreate,
    inputs: list[TaskInputCreate]
) -> OperacionResponse:
    try:
        logging.info("Iniciando create_operation_with_inputs")
        logging.info(f"Operacion: {operation}")
        logging.info(f"Inputs: {inputs}")

        # Crear la operación
        db_operation = Operacion(
            parcela_id=operation.parcela_id,
            tipo_operacion=operation.tipo_operacion,
            fecha_inicio=operation.fecha_inicio,
            fecha_fin=operation.fecha_fin,
            estado=operation.estado,
            responsable_id=operation.responsable_id,
            nota=operation.nota,
            comentario=operation.comentario,
            inputs=[] # Inicializa la lista de inputs
        )

        db.add(db_operation)
        await db.flush() # Es importante hacer un flush para obtener el ID de db_operation

        # Crear y consumir los insumos
        inputs_response = []
        for input_data in inputs:
            logging.info(f"Procesando input_data: {input_data}")

            # Crear el movimiento de inventario
            movement = InventoryMovementCreate(
                input_id=input_data.input_id,
                warehouse_id=input_data.warehouse_id,
                quantity=input_data.used_quantity,
                movement_type="exit",
                movement_date=datetime.now(),
                operation_id=db_operation.id,
                description=f"Consumo de insumo para operación {db_operation.id}"
            )
            logging.info(f"Creando movimiento de inventario: {movement}")
            await create_inventory_movement(db, movement)
            logging.info("Movimiento de inventario creado")

            # Crear la instancia del modelo TaskInput
            db_task_input = TaskInput(
                input_id=input_data.input_id,
                used_quantity=input_data.used_quantity,
                warehouse_id=input_data.warehouse_id,
                status=input_data.status,
                operation_id=db_operation.id
            )
            db_operation.inputs.append(db_task_input) # Asocia el TaskInput a la Operacion

            input_response = TaskInputCreate( # Esto es para la respuesta
                input_id=input_data.input_id,
                used_quantity=input_data.used_quantity,
                warehouse_id=input_data.warehouse_id,
                status=input_data.status,
                operation_id=db_operation.id
            )
            logging.info(f"Creando input_response: {input_response}")
            inputs_response.append(input_response)

        await db.commit()
        await db.refresh(db_operation)

        logging.info(f"inputs_response: {inputs_response}")
        logging.info(f"db_operation: {db_operation.__dict__}")

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
            inputs=inputs_response # Aquí estás devolviendo los TaskInputCreate, no los TaskInput de la DB
        )
    except HTTPException as e:
        logging.error(f"HTTPException: {e}")
        await db.rollback()
        raise e
    except Exception as e:
        logging.exception("Error al crear operación y consumir insumos")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear operación y consumir insumos: {str(e)}")
  
async def update_operacion_inputs(db: AsyncSession, operacion_id: int, inputs_data: List[TaskInputUpdate]):
    # Eliminar los insumos existentes para esta operacion
    await db.execute(delete(TaskInput).where(TaskInput.operation_id == operacion_id))

    # Crear y agregar los nuevos insumos
    for input_item in inputs_data:
        new_input = TaskInput(
            operation_id=operacion_id,
            input_id=input_item.input_id,
            used_quantity=input_item.used_quantity
            # Otros campos de TaskInput si los tienes
        )
        db.add(new_input)

    await db.commit()
