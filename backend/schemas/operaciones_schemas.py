from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from geoalchemy2.shape import to_shape
from geoalchemy2.types import WKBElement
from geoalchemy2.shape import to_shape
from .schemas_inventory import TaskInput, TaskInputCreate
class PlotForOPS(BaseModel):
    """Schema optimizado para operaciones - solo datos necesarios"""
    plot_id: int
    plot_name: str
    
    class Config:
        from_attributes = True

# Schema para inputs/insumos
class TaskInputBase(BaseModel):
    input_id: int
    used_quantity: int = Field(ge=0, description="Cantidad utilizada")
    warehouse_id: Optional[int] = Field(default=None, description="ID del almacén")
    status: str = Field(default="planned", description="Estado del insumo")

class TaskInputCreate(TaskInputBase):
    operation_id: Optional[int] = None

class TaskInputUpdate(BaseModel):
    input_id: int
    used_quantity: int = Field(ge=0)

class TaskInputResponse(TaskInputBase):
    id: int
    operation_id: Optional[int] = None
    
    class Config:
        from_attributes = True


# Schemas principales de operaciones
class OperacionBase(BaseModel):
    tipo_operacion: str = Field(..., description="Tipo de operación")
    parcela_id: int = Field(..., description="ID de la parcela")
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    estado: str = Field(default="planned", description="Estado de la operación")
    responsable_id: Optional[int] = None
    creation_date: Optional[datetime] = None
    jornales: Optional[float] = None
    personas: Optional[int] = None
    porcentaje_avance: Optional[int] = None
    nota: Optional[str] = ""
    comentario: Optional[str] = ""

class OperacionCreate(OperacionBase):
    inputs: List[TaskInputCreate] = []

class OperacionUpdate(BaseModel):
    tipo_operacion: Optional[str] = None
    parcela_id: Optional[int] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    estado: Optional[str] = None
    responsable_id: Optional[int] = None
    creation_date: Optional[datetime] = None
    jornales: Optional[float] = None
    personas: Optional[int] = None
    porcentaje_avance: Optional[int] = None
    nota: Optional[str] = None
    comentario: Optional[str] = None

class OperacionInputsUpdate(BaseModel):
    inputs: List[TaskInputUpdate]

# Response optimizado
class OperacionResponse(OperacionBase):
    id: int
    inputs: List[TaskInputResponse] = []
    # Información enriquecida opcional
    parcela: Optional[PlotForOPS] = None
    
    class Config:
        from_attributes = True

# Schema para listados con información mínima
class OperacionListItem(BaseModel):
    """Schema optimizado para listados - datos mínimos"""
    id: int
    tipo_operacion: str
    parcela_id: int
    parcela_name: Optional[str] = None  # Se puede agregar con join
    estado: str
    fecha_inicio: Optional[datetime] = None
    responsable_id: Optional[int] = None
    inputs_count: int = 0  # Contador de insumos
    # Nuevos campos para listados
    creation_date: Optional[datetime] = None
    jornales: Optional[float] = None
    personas: Optional[int] = None
    porcentaje_avance: Optional[int] = None
    
    class Config:
        from_attributes = True

# Schema para vista detallada
class Operacion(OperacionResponse):
    """Schema completo para vista detallada"""
    pass