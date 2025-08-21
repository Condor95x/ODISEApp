from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..schemas.schemas_inventory import TaskInputCreate
from ..schemas.schemas_winery import VesselActivity,VesselActivityUpdate,VesselActivityCreate,VesselActivityResponse,Batch,BatchUpdate,BatchCreate,Vessel,VesselUpdate,VesselCreate
from ..crud.crud_winery import delete_vessel_activity_CRUD,create_vessel_activity_with_inputs_CRUD,update_vessel_activity_CRUD,update_vessel_activity_CRUD,get_vessel_activity_CRUD, get_vessel_activities_CRUD,delete_batch_CRUD,update_batch_CRUD,get_batches_CRUD,get_batch_CRUD,create_batch_CRUD,update_vessel_CRUD,get_vessels_CRUD,delete_vessel_CRUD,get_vessel_CRUD,create_vessel_CRUD
from typing import List
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/winery",
    tags=["winery"]
    )

# Vessels Endpoints
@router.post("/vessels/", response_model=Vessel)
async def create_vessel(vessel: VesselCreate, db: AsyncSession = Depends(get_db)):
    return await create_vessel_CRUD(db, vessel)

@router.get("/vessels/", response_model=list[Vessel])
async def read_vessels(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    vessels = await get_vessels_CRUD(db, skip=skip, limit=limit)
    return vessels

@router.get("/vessels/{vessel_id}", response_model=Vessel)
async def read_vessel(vessel_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel = await get_vessel_CRUD(db, vessel_id)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

@router.put("/vessels/{vessel_id}", response_model=Vessel)
async def update_vessel(vessel_id: int, vessel: VesselUpdate, db: AsyncSession = Depends(get_db)):
    db_vessel = await update_vessel_CRUD(db, vessel_id, vessel)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

@router.delete("/vessels/{vessel_id}", response_model=Vessel)
async def delete_vessel(vessel_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel = await delete_vessel_CRUD(db, vessel_id)
    if db_vessel is None:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return db_vessel

# Batches Endpoints
@router.post("/batches/", response_model=Batch)
async def create_batch(batch: BatchCreate, db: AsyncSession = Depends(get_db)):
    return await create_batch_CRUD(db, batch)

@router.get("/batches/{batch_id}", response_model=Batch)
async def read_batch(batch_id: int, db: AsyncSession = Depends(get_db)):
    db_batch = await get_batch_CRUD(db, batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

@router.get("/batches/", response_model=list[Batch])
async def read_batches(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    batches = await get_batches_CRUD(db, skip=skip, limit=limit)
    return batches

@router.put("/batches/{batch_id}", response_model=Batch)
async def update_batch(batch_id: int, batch: BatchUpdate, db: AsyncSession = Depends(get_db)):
    db_batch = await update_batch_CRUD(db, batch_id, batch)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

@router.delete("/batches/{batch_id}", response_model=Batch)
async def delete_batch(batch_id: int, db: AsyncSession = Depends(get_db)):
    db_batch = await delete_batch_CRUD(db, batch_id)
    if db_batch is None:
        raise HTTPException(status_code=404, detail="Batch not found")
    return db_batch

# Vessel Activities Endpoints
@router.post("/vessel_activities/", response_model=VesselActivityResponse)
async def create_vessel_activity_with_inputs(
    vessel_activity: VesselActivityCreate,
    inputs: List[TaskInputCreate],
    db: AsyncSession = Depends(get_db)
):
    return await create_vessel_activity_with_inputs_CRUD(db, vessel_activity, inputs)

@router.get("/vessel_activities/{vessel_activity_id}", response_model=VesselActivity)
async def read_vessel_activity(vessel_activity_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await get_vessel_activity_CRUD(db, vessel_activity_id)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity

@router.get("/vessel_activities/", response_model=list[VesselActivity])
async def read_vessel_activities(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    vessel_activities = await get_vessel_activities_CRUD(db, skip=skip, limit=limit)
    return vessel_activities

@router.put("/vessel_activities/{vessel_activity_id}", response_model=VesselActivity)
async def update_vessel_activity(vessel_activity_id: int, vessel_activity: VesselActivityUpdate, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await update_vessel_activity_CRUD(db, vessel_activity_id, vessel_activity)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity

@router.delete("/vessel_activities/{vessel_activity_id}", response_model=VesselActivity)
async def delete_vessel_activity(vessel_activity_id: int, db: AsyncSession = Depends(get_db)):
    db_vessel_activity = await delete_vessel_activity_CRUD(db, vessel_activity_id)
    if db_vessel_activity is None:
        raise HTTPException(status_code=404, detail="Vessel Activity not found")
    return db_vessel_activity
