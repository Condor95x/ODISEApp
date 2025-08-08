from datetime import date, datetime
from typing import Optional,List
from pydantic import BaseModel
#import schemas.schemas_inventory as schemas

class VesselBase(BaseModel):
    name: str
    type: Optional[str] = None
    capacity: Optional[float] = None
    capacity_unit: Optional[str] = None
    acquisition_date: Optional[date] = None
    status: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None

class VesselCreate(VesselBase):
    pass

class VesselUpdate(VesselBase):
    pass

class Vessel(VesselBase):
    id: int

    class Config:
        orm_mode = True

class BatchBase(BaseModel):
    name: str
    entry_date:  Optional[date] = None
    exit_date: Optional[date] = None
    variety: Optional[str] = None
    plot_id: Optional[int] = None
    description: Optional[str] = None
    vessel_id: Optional[int] = None
    initial_volume: Optional[float] = None
    current_volume: Optional[float] = None

class BatchCreate(BatchBase):
    pass

class BatchUpdate(BatchBase):
    pass

class Batch(BatchBase):
    id: int

    class Config:
        orm_mode = True

class VesselActivityBase(BaseModel):
    origin_vessel_id: Optional[int] = None
    destination_vessel_id: Optional[int] = None
    task_id: int
    start_date: Optional[date]  = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    responsible_id: Optional[int] = None
    notes: Optional[str] = None
    comments: Optional[str] = None
    origin_batch_id: Optional[int] = None
    destination_batch_id: Optional[int] = None
    volume: Optional[float] = None

class VesselActivityCreate(VesselActivityBase):
    #inputs: Optional[List[schemas.TaskInputCreate]]
    pass

class VesselActivityUpdate(VesselActivityBase):
    pass

class VesselActivity(VesselActivityBase):
    id: int

    class Config:
        orm_mode = True

class VesselActivityResponse(VesselActivityBase):
    id: int