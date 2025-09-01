from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from fastapi import HTTPException
from ..models import Sector, Finca  # Ajusta la ruta según tu estructura
from pydantic import BaseModel

# Schemas Pydantic para validación
class SectorBase(BaseModel):
    finca_id: int
    value: str
    description: Optional[str] = None

class SectorCreate(SectorBase):
    pass

class SectorUpdate(BaseModel):
    finca_id: Optional[int] = None
    value: Optional[str] = None
    description: Optional[str] = None

class SectorResponse(SectorBase):
    sector_id: int
    etiqueta: Optional[str] = None
    
    class Config:
        from_attributes = True

class SectorWithFincaResponse(SectorResponse):
    finca: Optional[dict] = None

# Operaciones CRUD Async
async def create_sector(db: AsyncSession, sector: SectorCreate) -> Sector:
    """Crear un nuevo sector"""
    # Verificar que la finca existe
    finca_result = await db.execute(
        select(Finca).where(Finca.finca_id == sector.finca_id)
    )
    finca = finca_result.scalar_one_or_none()
    
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    try:
        db_sector = Sector(**sector.dict())
        db.add(db_sector)
        await db.commit()
        await db.refresh(db_sector)
        return db_sector
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al crear sector: {str(e)}")

async def get_sector(db: AsyncSession, sector_id: int) -> Optional[Sector]:
    """Obtener un sector por ID"""
    result = await db.execute(
        select(Sector)
        .options(selectinload(Sector.finca))  # Cargar la finca relacionada
        .where(Sector.sector_id == sector_id)
    )
    sector = result.scalar_one_or_none()
    if not sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    return sector

async def get_sectores(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Sector]:
    """Obtener lista de sectores con paginación"""
    result = await db.execute(
        select(Sector)
        .options(selectinload(Sector.finca))  # Cargar la finca relacionada
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def get_sectores_by_finca(db: AsyncSession, finca_id: int) -> List[Sector]:
    """Obtener todos los sectores de una finca específica"""
    # Verificar que la finca existe
    finca_result = await db.execute(
        select(Finca).where(Finca.finca_id == finca_id)
    )
    finca = finca_result.scalar_one_or_none()
    
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    result = await db.execute(
        select(Sector)
        .options(selectinload(Sector.finca))
        .where(Sector.finca_id == finca_id)
    )
    return result.scalars().all()

async def update_sector(db: AsyncSession, sector_id: int, sector_update: SectorUpdate) -> Sector:
    """Actualizar un sector"""
    # Primero verificar que el sector existe
    result = await db.execute(
        select(Sector).where(Sector.sector_id == sector_id)
    )
    db_sector = result.scalar_one_or_none()
    
    if not db_sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    
    # Si se quiere cambiar la finca, verificar que existe
    if sector_update.finca_id is not None:
        finca_result = await db.execute(
            select(Finca).where(Finca.finca_id == sector_update.finca_id)
        )
        finca = finca_result.scalar_one_or_none()
        if not finca:
            raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    try:
        # Actualizar solo los campos proporcionados
        update_data = sector_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_sector, field, value)
        
        await db.commit()
        await db.refresh(db_sector)
        return db_sector
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al actualizar sector: {str(e)}")

async def delete_sector(db: AsyncSession, sector_id: int) -> bool:
    """Eliminar un sector"""
    # Primero verificar que existe
    result = await db.execute(
        select(Sector).where(Sector.sector_id == sector_id)
    )
    db_sector = result.scalar_one_or_none()
    
    if not db_sector:
        raise HTTPException(status_code=404, detail="Sector no encontrado")
    
    try:
        # Verificar si tiene plots asociados
        # Nota: ajusta según tu modelo Plot
        from ..models import Plot  # Ajusta la importación
        plots_result = await db.execute(
            select(Plot).where(Plot.sector_id == sector_id)
        )
        plots = plots_result.scalars().all()
        
        if plots:
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar el sector porque tiene plots asociados"
            )
        
        await db.delete(db_sector)
        await db.commit()
        return True
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar sector: {str(e)}")

async def search_sectores(db: AsyncSession, search_term: str) -> List[Sector]:
    """Buscar sectores por value, description o etiqueta"""
    search_pattern = f"%{search_term}%"
    result = await db.execute(
        select(Sector)
        .options(selectinload(Sector.finca))
        .where(
            or_(
                Sector.value.ilike(search_pattern),
                Sector.description.ilike(search_pattern),
                Sector.etiqueta.ilike(search_pattern)
            )
        )
    )
    return result.scalars().all()

async def count_sectores_by_finca(db: AsyncSession, finca_id: int) -> int:
    """Contar sectores de una finca específica"""
    from sqlalchemy import func
    
    # Verificar que la finca existe
    finca_result = await db.execute(
        select(Finca).where(Finca.finca_id == finca_id)
    )
    if not finca_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    result = await db.execute(
        select(func.count(Sector.sector_id)).where(Sector.finca_id == finca_id)
    )
    return result.scalar()

async def count_sectores(db: AsyncSession) -> int:
    """Contar total de sectores"""
    from sqlalchemy import func
    result = await db.execute(select(func.count(Sector.sector_id)))
    return result.scalar()