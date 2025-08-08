from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import logging
from fastapi import HTTPException
from datetime import datetime
from ..models import Batch, Vessel, VesselActivity, InventoryMovement
from ..schemas.schemas_winery  import VesselCreate,VesselUpdate,BatchCreate,BatchUpdate,VesselActivityCreate,VesselActivityUpdate,VesselActivityCreate,VesselActivityResponse
from ..schemas.schemas_inventory import TaskInputCreate, InventoryMovementCreate
from ..crud.crud_inventory import create_inventory_movement


async def create_vessel(db: AsyncSession, vessel: VesselCreate) -> Vessel:
    db_vessel = Vessel(**vessel.dict())
    db.add(db_vessel)
    await db.commit()
    await db.refresh(db_vessel)
    return db_vessel

async def get_vessel(db: AsyncSession, vessel_id: int) -> Vessel:
    result = await db.execute(select(Vessel).filter(Vessel.id == vessel_id))
    return result.scalar_one_or_none()

async def get_vessels(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Vessel]:
    result = await db.execute(select(Vessel).offset(skip).limit(limit))
    return result.scalars().all()

async def update_vessel(db: AsyncSession, vessel_id: int, vessel: VesselUpdate) -> Vessel:
    db_vessel = await get_vessel(db, vessel_id)
    if db_vessel:
        for key, value in vessel.dict(exclude_unset=True).items():
            setattr(db_vessel, key, value)
        await db.commit()
        await db.refresh(db_vessel)
    return db_vessel

async def delete_vessel(db: AsyncSession, vessel_id: int) -> Vessel:
    db_vessel = await get_vessel(db, vessel_id)
    if db_vessel:
        await db.delete(db_vessel)
        await db.commit()
    return db_vessel

async def create_batch(db: AsyncSession, batch: BatchCreate) -> Batch:
    db_batch = Batch(**batch.dict())
    db.add(db_batch)
    await db.commit()
    await db.refresh(db_batch)
    return db_batch

async def get_batch(db: AsyncSession, batch_id: int) -> Batch:
    result = await db.execute(select(Batch).filter(Batch.id == batch_id))
    return result.scalar_one_or_none()

async def get_batches(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[Batch]:
    result = await db.execute(select(Batch).offset(skip).limit(limit))
    return result.scalars().all()

async def update_batch(db: AsyncSession, batch_id: int, batch: BatchUpdate) -> Batch:
    db_batch = await get_batch(db, batch_id)
    if db_batch:
        for key, value in batch.dict(exclude_unset=True).items():
            setattr(db_batch, key, value)
        await db.commit()
        await db.refresh(db_batch)
    return db_batch

async def delete_batch(db: AsyncSession, batch_id: int) -> Batch:
    db_batch = await get_batch(db, batch_id)
    if db_batch:
        await db.delete(db_batch)
        await db.commit()
    return db_batch

async def create_vessel_activity(db: AsyncSession, vessel_activity: VesselActivityCreate) -> VesselActivity:
    vessel_activity_data = vessel_activity.dict()
    vessel_activity_data.pop("inputs", None)
    db_vessel_activity = VesselActivity(**vessel_activity_data)
    await db.commit()
    await db.refresh(db_vessel_activity)
    return db_vessel_activity

async def get_vessel_activity(db: AsyncSession, vessel_activity_id: int) -> VesselActivity:
    result = await db.execute(select(VesselActivity).filter(VesselActivity.id == vessel_activity_id))
    return result.scalar_one_or_none()

async def get_vessel_activities(db: AsyncSession, skip: int = 0, limit: int = 100) -> list[VesselActivity]:
    result = await db.execute(select(VesselActivity).offset(skip).limit(limit))
    return result.scalars().all()

async def update_vessel_activity(db: AsyncSession, vessel_activity_id: int, vessel_activity: VesselActivityUpdate) -> VesselActivity:
    db_vessel_activity = await get_vessel_activity(db, vessel_activity_id)
    if db_vessel_activity:
        for key, value in vessel_activity.dict(exclude_unset=True).items():
            setattr(db_vessel_activity, key, value)
        await db.commit()
        await db.refresh(db_vessel_activity)
    return db_vessel_activity

async def delete_vessel_activity(db: AsyncSession, vessel_activity_id: int) -> VesselActivity:
    db_vessel_activity = await get_vessel_activity(db, vessel_activity_id)
    if db_vessel_activity:
        await db.delete(db_vessel_activity)
        await db.commit()
    return db_vessel_activity

async def create_vessel_activity_with_inputs(
    db: AsyncSession,
    vessel_activity: VesselActivityCreate,
    inputs: list[TaskInputCreate]
) -> VesselActivityResponse:
    try:
        logging.info(f"Datos recibidos: {vessel_activity}, {inputs}")
        logging.info("Iniciando create_vessel_activity_with_inputs")
        logging.info(f"Vessel Activity: {vessel_activity}")
        logging.info(f"Inputs: {inputs}")

        # Crear la actividad de la vasija
        db_vesselact = VesselActivity(
            #id=vessel_activity.id,
            origin_vessel_id=vessel_activity.origin_vessel_id,
            destination_vessel_id=vessel_activity.destination_vessel_id,
            task_id=vessel_activity.task_id,
            start_date=vessel_activity.start_date,
            end_date=vessel_activity.end_date,
            status=vessel_activity.status,
            responsible_id=vessel_activity.responsible_id,
            notes=vessel_activity.notes,
            comments=vessel_activity.comments,
            origin_batch_id=vessel_activity.origin_batch_id,
            destination_batch_id=vessel_activity.destination_batch_id,
            volume=vessel_activity.volume
        )

        db.add(db_vesselact)
        await db.commit()
        await db.refresh(db_vesselact)

        # Crear y consumir los insumos
        inputs_response = []
        for input_data in inputs:
            logging.info(f"Procesando input_data: {input_data}")

            movement = InventoryMovementCreate(
                input_id=input_data.input_id,
                warehouse_id=input_data.warehouse_id,
                quantity=input_data.used_quantity,
                movement_type="exit",
                movement_date=datetime.now(),
                operation_id=db_vesselact.id,
                description=f"Consumo de insumo para operación {db_vesselact.id}"
            )
            logging.info(f"Creando movimiento de inventario: {movement}")
            await create_inventory_movement(db, movement)
            logging.info("Movimiento de inventario creado")

            input_response = TaskInputCreate(
                input_id=input_data.input_id,
                used_quantity=input_data.used_quantity,
                warehouse_id=input_data.warehouse_id,
                status=input_data.status,
                operation_id=db_vesselact.id
            )

            logging.info(f"Creando input_response: {input_response}")
            inputs_response.append(input_response)

        await db.commit()

        logging.info(f"inputs_response: {inputs_response}")
        logging.info(f"db_operation: {db_vesselact.__dict__}")

        return VesselActivityResponse(
            id=db_vesselact.id,
            origin_vessel_id=vessel_activity.origin_vessel_id,
            destination_vessel_id=vessel_activity.destination_vessel_id,
            task_id=vessel_activity.task_id,
            start_date=vessel_activity.start_date,
            end_date=vessel_activity.end_date,
            status=vessel_activity.status,
            responsible_id=vessel_activity.responsible_id,
            notes=vessel_activity.notes,
            comments=vessel_activity.comments,
            origin_batch_id=vessel_activity.origin_batch_id,
            destination_batch_id=vessel_activity.destination_batch_id,
            volume=vessel_activity.volume
        )
    
    except HTTPException as e:
        logging.error(f"HTTPException: {e}")
        await db.rollback()
        raise e
    except Exception as e:
        logging.exception("Error al crear la actividad y consumir insumos")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear la actividad y consumir insumos: {str(e)}")
    

