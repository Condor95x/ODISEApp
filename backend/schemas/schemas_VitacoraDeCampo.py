from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CategoriaImagenesBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    activo: bool = True

class CategoriaImagenesCreate(CategoriaImagenesBase):
    pass

class CategoriaImagenesUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None

class CategoriaImagenesResponse(CategoriaImagenesBase):
    id_categoria_img: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    
    class Config:
        from_attributes = True

class VitacoraCampoBase(BaseModel):
    nombre_archivo: str
    fecha_captura: datetime
    descripcion: Optional[str] = None
    id_categoria_img: int

class VitacoraCampoCreate(VitacoraCampoBase):
    pass

class VitacoraCampoUpdate(BaseModel):
    nombre_archivo: Optional[str] = None
    fecha_captura: Optional[datetime] = None
    descripcion: Optional[str] = None
    id_categoria_img: Optional[int] = None

class VitacoraCampoResponse(VitacoraCampoBase):
    id_vitacora: int
    tipo_mime: str
    tamaño_archivo: int
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    activo: bool
    categoria: CategoriaImagenesResponse
    
    class Config:
        from_attributes = True

class VitacoraCampoListResponse(BaseModel):
    id_vitacora: int
    nombre_archivo: str
    tipo_mime: str
    tamaño_archivo: int
    fecha_creacion: datetime
    fecha_captura: datetime
    descripcion: Optional[str] = None
    activo: bool
    categoria_nombre: str
    categoria_id: int
    
    class Config:
        from_attributes = True