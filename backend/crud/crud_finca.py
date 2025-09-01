from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from typing import List, Optional
from fastapi import HTTPException
from ..models import Finca
from pydantic import BaseModel

# Schemas Pydantic para validación
class FincaBase(BaseModel):
    value: str
    description: Optional[str] = None

class FincaCreate(FincaBase):
    pass

class FincaUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None

class FincaResponse(FincaBase):
    finca_id: int
    
    class Config:
        from_attributes = True

# Operaciones CRUD Async
async def create_finca(db: AsyncSession, finca: FincaCreate) -> Finca:
    """Crear una nueva finca"""
    try:
        db_finca = Finca(**finca.dict())
        db.add(db_finca)
        await db.commit()
        await db.refresh(db_finca)
        return db_finca
    except Exception as e:
        await db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Finca con value '{finca.value}' ya existe")
        raise HTTPException(status_code=400, detail=f"Error al crear finca: {str(e)}")

async def get_finca(db: AsyncSession, finca_id: int) -> Optional[Finca]:
    """Obtener una finca por ID"""
    result = await db.execute(
        select(Finca).where(Finca.finca_id == finca_id)
    )
    finca = result.scalar_one_or_none()
    if not finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    return finca

async def get_fincas(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Finca]:
    """Obtener lista de fincas con paginación"""
    result = await db.execute(
        select(Finca).offset(skip).limit(limit)
    )
    return result.scalars().all()

async def update_finca(db: AsyncSession, finca_id: int, finca_update: FincaUpdate) -> Finca:
    """Actualizar una finca"""
    # Primero verificar que existe
    result = await db.execute(
        select(Finca).where(Finca.finca_id == finca_id)
    )
    db_finca = result.scalar_one_or_none()
    
    if not db_finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    try:
        # Actualizar solo los campos proporcionados
        update_data = finca_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_finca, field, value)
        
        await db.commit()
        await db.refresh(db_finca)
        return db_finca
    except Exception as e:
        await db.rollback()
        if "unique constraint" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Finca con value '{finca_update.value}' ya existe")
        raise HTTPException(status_code=400, detail=f"Error al actualizar finca: {str(e)}")

async def delete_finca(db: AsyncSession, finca_id: int) -> bool:
    """Eliminar una finca"""
    # Primero verificar que existe y obtener relaciones
    result = await db.execute(
        select(Finca).where(Finca.finca_id == finca_id)
    )
    db_finca = result.scalar_one_or_none()
    
    if not db_finca:
        raise HTTPException(status_code=404, detail="Finca no encontrada")
    
    try:
        # Verificar si tiene sectores asociados
        # Nota: asumiendo que ya tienes la relación cargada o necesitas hacer otra query
        from ..models import Sector  # Ajusta la importación
        sectores_result = await db.execute(
            select(Sector).where(Sector.finca_id == finca_id)
        )
        sectores = sectores_result.scalars().all()
        
        if sectores:
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar la finca porque tiene sectores asociados"
            )
        
        await db.delete(db_finca)
        await db.commit()
        return True
    except HTTPException:
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Error al eliminar finca: {str(e)}")

async def search_fincas(db: AsyncSession, search_term: str) -> List[Finca]:
    """Buscar fincas por value o description"""
    search_pattern = f"%{search_term}%"
    result = await db.execute(
        select(Finca).where(
            or_(
                Finca.value.ilike(search_pattern),
                Finca.description.ilike(search_pattern)
            )
        )
    )
    return result.scalars().all()

async def count_fincas(db: AsyncSession) -> int:
    """Contar total de fincas"""
    from sqlalchemy import func
    result = await db.execute(select(func.count(Finca.finca_id)))
    return result.scalar()