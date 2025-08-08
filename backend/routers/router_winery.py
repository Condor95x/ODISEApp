from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
import schemas.schemas_inventory
import schemas.schemas_winery
import crud.crud_winery
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/winery",
    tags=["winery"]
    )

# Vessels Endpoints
@router.post("/vessels/", response_model=schemas.schemas_winery.Vessel)
async def create_vessel(vessel: schemas.schemas_winery.VesselCreate, db: AsyncSession = Depends(get_db)):
    return await crud.crud_winery.create_vessel(db, vessel)

@router.get("/vessels/{vessel_id}", response_model=schemas.schemas_winery.Vessel)
async def read_vessel(vessel_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel = await crud.crud_winery.get_vessel(db, vessel_id)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

@router.get("/vessels/", response_model=list[schemas.schemas_winery.Vessel])
async def read_vessels(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    vessels = await crud.crud_winery.get_vessels(db, skip=skip, limit=limit)
    return vessels

@router.put("/vessels/{vessel_id}", response_model=schemas.schemas_winery.Vessel)
async def update_vessel(vessel_id: int, vessel: schemas.schemas_winery.VesselUpdate, db: AsyncSession = Depends(get_db)):
    db_vessel = await crud.crud_winery.update_vessel(db, vessel_id, vessel)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

@router.delete("/vessels/{vessel_id}", response_model=schemas.schemas_winery.Vessel)
async def delete_vessel(vessel_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel = await crud.crud_winery.delete_vessel(db, vessel_id)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

# Batches Endpoints
@router.post("/batches/", response_model=schemas.schemas_winery.Batch)
async def create_batch(batch: schemas.schemas_winery.BatchCreate, db: AsyncSession = Depends(get_db)):
    return await crud.crud_winery.create_batch(db, batch)

@router.get("/batches/{batch_id}", response_model=schemas.schemas_winery.Batch)
async def read_batch(batch_id: int, db: AsyncSession = Depends(get_db)):
    db_batch = await crud.crud_winery.get_batch(db, batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

@router.get("/batches/", response_model=list[schemas.schemas_winery.Batch])
async def read_batches(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    batches = await crud.crud_winery.get_batches(db, skip=skip, limit=limit)
    return batches

@router.put("/batches/{batch_id}", response_model=schemas.schemas_winery.Batch)
async def update_batch(batch_id: int, batch: schemas.schemas_winery.BatchUpdate, db: AsyncSession = Depends(get_db)):
    db_batch = await crud.crud_winery.update_batch(db, batch_id, batch)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

@router.delete("/batches/{batch_id}", response_model=schemas.schemas_winery.Batch)
async def delete_batch(batch_id: int, db: AsyncSession = Depends(get_db)):
    db_batch = await crud.crud_winery.delete_batch(db, batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

# Vessel Activities Endpoints
@router.post("/vessel_activities/", response_model=schemas.schemas_winery.VesselActivityResponse)
async def create_vessel_activity_with_inputs(
    vessel_activity: schemas.schemas_winery.VesselActivityCreate,
    inputs: List[schemas.schemas_inventory.TaskInputCreate],
    db: AsyncSession = Depends(get_db)
):
    return await crud.crud_winery.create_vessel_activity_with_inputs(db, vessel_activity, inputs)

@router.get("/vessel_activities/{vessel_activity_id}", response_model=schemas.schemas_winery.VesselActivity)
async def read_vessel_activity(vessel_activity_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await crud.crud_winery.get_vessel_activity(db, vessel_activity_id)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity

@router.get("/vessel_activities/", response_model=list[schemas.schemas_winery.VesselActivity])
async def read_vessel_activities(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    vessel_activities = await crud.crud_winery.get_vessel_activities(db, skip=skip, limit=limit)
    return vessel_activities

@router.put("/vessel_activities/{vessel_activity_id}", response_model=schemas.schemas_winery.VesselActivity)
async def update_vessel_activity(vessel_activity_id: int, vessel_activity: schemas.schemas_winery.VesselActivityUpdate, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await crud.crud_winery.update_vessel_activity(db, vessel_activity_id, vessel_activity)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity

@router.delete("/vessel_activities/{vessel_activity_id}", response_model=schemas.schemas_winery.VesselActivity)
async def delete_vessel_activity(vessel_activity_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await crud.crud_winery.delete_vessel_activity(db, vessel_activity_id)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity
