from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import date
from geoalchemy2.shape import to_shape
from geoalchemy2.types import WKBElement
from geoalchemy2.shape import to_shape
from .schemas_inventory import TaskInput, TaskInputCreate

class ParcelaBase(BaseModel):
    id: int
    nombre: str
    geom: Optional[str] = None

    @validator("geom", pre=True, always=True)
    def convert_geom(cls, v):
        if isinstance(v, WKBElement):
            return to_shape(v).wkt
        return v

class OperacionBase(BaseModel):
    id: int
    parcela_id: int
    tipo_operacion: str
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    estado: Optional[str] = None
    responsable_id: int
    nota: Optional[str] = None
    comentario: Optional[str] = None
    inputs: Optional[List[TaskInput]] = None

    class Config:
        from_attributes = True

class OperacionCreate(BaseModel):
    parcela_id: Optional[int]
    tipo_operacion: str
    fecha_inicio: Optional[date]
    fecha_fin: Optional[date]
    estado: Optional[str]
    responsable_id: int
    nota: Optional[str]
    comentario: Optional[str]
    inputs: Optional[List[TaskInputCreate]]

class OperacionUpdate(BaseModel):
    parcela_id: Optional[int]
    tipo_operacion: Optional[str]
    fecha_inicio: Optional[date]
    fecha_fin: Optional[date]
    estado: Optional[str]
    responsable_id: Optional[int]
    nota: Optional[str]
    comentario: Optional[str]
    inputs: Optional[List[TaskInputCreate]] = None
    
class Operacion(OperacionBase):
    pass 

class OperacionResponse(BaseModel):
    id: Optional[int] = None
    parcela_id: int
    tipo_operacion: str
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    estado: Optional[str] = None
    responsable_id: int
    nota: Optional[str] = None
    comentario: Optional[str] = None
    inputs: Optional[List[TaskInputCreate]]

class TaskInputUpdate(BaseModel):
    input_id: int
    used_quantity: int

class OperacionInputsUpdate(BaseModel):
    inputs: List[TaskInputUpdate]