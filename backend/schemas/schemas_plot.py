from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# Schemas para objetos anidados
class GrapevineInfo(BaseModel):
    """Información básica de variedad/portainjerto"""
    gv_id: str
    name: str
    color: Optional[str] = None
    gv_type: Optional[str] = None

class GrapevineInfoData(BaseModel):
    """Información básica de variedad/portainjerto"""
    gv_id: str
    name: str

class VineyardInfo(BaseModel):
    """Información de sistemas de conducción/manejo"""
    vy_id: str
    value: str
    description: Optional[str] = None

class VineyardInfoData(BaseModel):
    """Información de sistemas de conducción/manejo"""
    vy_id: str
    value: str

class FincaInfo(BaseModel):
    """Info base de la finca"""
    id: int
    value: str
    description: Optional[str]

class FincaInfoData(BaseModel):
    """Info base de la finca"""
    id: int
    value: Optional[str]

class SectorInfo(BaseModel):
    """Informacion del sector y su finca"""
    id: int
    value: str
    finca: int
    description: Optional[str]

class SectorInfoData(BaseModel):
    """Informacion del sector y su finca"""
    id: int
    value: str
    finca: FincaInfoData = None

# Schema principal optimizado
class PlotResponseOptimized(BaseModel):
    """Response optimizada que incluye toda la información relacionada"""
    plot_id: int
    plot_name: str
    plot_geom: Optional[str] = None
    plot_area: Optional[float] = None
    plot_implant_year: Optional[int] = None
    plot_creation_year: Optional[int] = None
    plot_description: Optional[str] = None
    sector_id: Optional[int]
    active: bool = True
    
    # Objetos anidados en lugar de IDs
    variety: Optional[GrapevineInfoData] = None
    rootstock: Optional[GrapevineInfoData] = None
    conduction: Optional[VineyardInfoData] = None
    management: Optional[VineyardInfoData] = None
    sector: Optional[SectorInfoData] = None

    class Config:
        from_attributes = True

# Schema para metadatos
class PlotMetadata(BaseModel):
    """Metadatos para selects del frontend"""
    varieties: List[GrapevineInfo]
    rootstocks: List[GrapevineInfo] 
    conduction_systems: List[VineyardInfo]
    management_types: List[VineyardInfo]
    sectores: List[SectorInfo]
    fincas: List[FincaInfo]

# Response combinada
class PlotsWithMetadata(BaseModel):
    """Response que incluye parcelas + metadatos"""
    plots: List[PlotResponseOptimized]
    metadata: PlotMetadata
    total_count: int
    filtered_count: int

# Schemas para crear/actualizar (mantienen IDs para simplificar)
class PlotCreate(BaseModel):
    plot_name: str = Field(..., description="Nombre de la parcela")
    plot_var: str = Field(..., description="ID de la variedad")
    plot_rootstock: Optional[str] = Field(None, description="ID del portainjerto")
    plot_implant_year: Optional[int] = Field(None, description="Año de implantación")
    plot_creation_year: Optional[int] = Field(None, description="Año de creación")
    plot_conduction: Optional[str] = Field(None, description="Sistema de conducción")
    plot_management: Optional[str] = Field(None, description="Tipo de manejo")
    plot_description: Optional[str] = Field(None, description="Descripción")
    plot_geom: str = Field(..., description="Geometría en formato WKT")
    plot_area: Optional[float] = Field(None, description="Área calculada")
    sector_id: Optional[int] = Field(None, description="Sector de la parcela")
    active: bool = Field(True, description="Estado activo")

class PlotUpdate(BaseModel):
    plot_name: Optional[str] = None
    plot_var: Optional[str] = None
    plot_rootstock: Optional[str] = None
    plot_implant_year: Optional[int] = None
    plot_creation_year: Optional[int] = None
    plot_conduction: Optional[str] = None
    plot_management: Optional[str] = None
    plot_description: Optional[str] = None
    plot_geom: Optional[str] = None
    plot_area: Optional[float] = None
    sector_id: Optional[int] = None
    active: Optional[bool] = None

# Schema para filtros
class PlotFilters(BaseModel):
    """Parámetros de filtrado"""
    active_only: bool = True
    filter_field: Optional[str] = None
    filter_value: Optional[str] = None
    variety_ids: Optional[List[str]] = None
    rootstock_ids: Optional[List[str]] = None
    conduction_systems: Optional[List[str]] = None
    management_types: Optional[List[str]] = None
    min_area: Optional[float] = None
    max_area: Optional[float] = None
    implant_year_from: Optional[int] = None
    implant_year_to: Optional[int] = None

class PlotForOPS(BaseModel):
    """Schema para recuperar los datos importantes para las operaciones"""
    plot_id: int
    plot_name: str
    class Config:
        from_attributes = True

# Mantener el schema original para compatibilidad
class PlotResponse(BaseModel):
    """Schema original para compatibilidad hacia atrás"""
    plot_id: int
    plot_name: str
    plot_var: str
    plot_rootstock: Optional[str] = None
    plot_implant_year: Optional[int] = None
    plot_creation_year: Optional[int] = None
    plot_conduction: Optional[str] = None
    plot_management: Optional[str] = None
    plot_description: Optional[str] = None
    plot_geom: Optional[str] = None
    plot_area: Optional[float] = None
    active: bool = True
    variety_name: Optional[str] = None
    sector_id: Optional[int] = None
    rootstock_name: Optional[str] = None
    
    class Config:
        from_attributes = True
