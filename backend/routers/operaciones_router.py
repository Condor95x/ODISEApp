from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select
from ..database import get_db
from ..schemas.operaciones_schemas import Operacion, OperacionCreate, OperacionInputsUpdate,OperacionUpdate, OperacionResponse
from ..crud.operaciones_crud import update_operacion, update_operacion_inputs, get_operacion, get_operaciones, create_operacion, delete_operacion, create_operation_with_inputs, get_vineyard_operaciones, get_winery_operaciones 
from ..models import Operacion as OperacionModel
from typing import List, Dict, Any

router = APIRouter()

@router.post("/", response_model=OperacionResponse)
async def create_operacion_with_inputs_endpoint(
    operacion: OperacionCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_operation_with_inputs(db, operacion, operacion.inputs)

@router.get("/")
async def read_operaciones(db: AsyncSession = Depends(get_db)):
    return await get_operaciones(db)

@router.get("/vineyard", response_model=List[Operacion])
async def read_vineyard_operaciones(db: AsyncSession = Depends(get_db)):
    """Obtiene la lista de todas las operaciones de tipo viñedo."""
    vineyard_operaciones = await get_vineyard_operaciones(db)
    return vineyard_operaciones

@router.get("/winery", response_model=List[Operacion])
async def read_winery_operaciones(db: AsyncSession = Depends(get_db)):
    """Obtiene la lista de todas las operaciones de tipo bodega."""
    winery_operaciones = await get_winery_operaciones(db)
    return winery_operaciones

@router.get("/{operacion_id}", response_model=Operacion)
async def read_operacion(operacion_id: int, db: AsyncSession = Depends(get_db)):
    operacion_db = await get_operacion(db, operacion_id)

    if operacion_db is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operacion not found")

    return operacion_db

@router.put("/{operacion_id}", status_code=status.HTTP_200_OK, response_model=Operacion)
async def update_operacion_endpoint(
    operacion_id: int,
    operacion_update: OperacionUpdate,
    db: AsyncSession = Depends(get_db)
):
    updated_operacion = await update_operacion(db, operacion_id, operacion_update)
    if updated_operacion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operacion not found")

    # Cargar explícitamente la relación 'inputs' con unique() para evitar duplicados
    result = await db.execute(
        select(OperacionModel).where(OperacionModel.id == operacion_id).options(joinedload(OperacionModel.inputs))
    )
    # ✅ Agregamos .unique() antes de scalar_one_or_none()
    updated_operacion_with_inputs = result.unique().scalar_one_or_none()

    return updated_operacion_with_inputs

@router.put("/{operacion_id}/inputs", status_code=status.HTTP_200_OK)
async def update_operacion_inputs_endpoint(
    operacion_id: int,
    inputs_update: OperacionInputsUpdate,
    db: AsyncSession = Depends(get_db)
):
    operacion = await get_operacion(db, operacion_id)
    if operacion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operacion not found")

    await update_operacion_inputs(db, operacion_id, inputs_update.inputs)
    return {"message": "Inputs updated successfully"}

@router.delete("/{operacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_operacion_endpoint(operacion_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_operacion(db, operacion_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="operacion not found")
    return None