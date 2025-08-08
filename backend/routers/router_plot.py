from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from ..database import get_db
from schemas.schemas_plot import PlotCreate, PlotUpdate, PlotResponse
from crud.crud_plot import create_plot, get_plots, get_plot, update_plot, delete_plot_permanent, archive_plot
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=PlotResponse, status_code=status.HTTP_201_CREATED, description="Crea una nueva parcela vitícola")
async def create_new_plot(
    plot: PlotCreate,
    db: AsyncSession = Depends(get_db)
):
    try:
        return await create_plot(db, plot)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al crear parcela: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error al crear la parcela")
    
@router.get("/", 
    response_model=List[PlotResponse],
    description="Obtiene todas las parcelas vitícolas")
async def read_plots(
    active_only: bool = Query(True, description="Solo mostrar parcelas activas"),
    db: AsyncSession = Depends(get_db)
):
    try:
        return await get_plots(db, active_only=active_only)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener parcelas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener las parcelas"
        )

@router.get("/{plot_id}", 
    response_model=PlotResponse,
    description="Obtiene una parcela específica por ID")
async def read_plot(
    plot_id: int, 
    db: AsyncSession = Depends(get_db)
):
    try:
        plot = await get_plot(db, plot_id)
        if plot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela no encontrada"
            )
        return plot
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al obtener parcela {plot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener la parcela"
        )

@router.put("/{plot_id}", 
    response_model=PlotResponse,
    description="Actualiza una parcela existente")
async def update_plot_endpoint(
    plot_id: int, 
    plot: PlotUpdate, 
    db: AsyncSession = Depends(get_db)
):
    try:
        updated_plot = await update_plot(db, plot_id, plot)
        if updated_plot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela no encontrada"
            )
        return updated_plot
    except HTTPException as he:
        raise he
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        logger.error(f"Error al actualizar parcela {plot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al actualizar la parcela"
        )

@router.delete("/{plot_id}/permanent", 
    status_code=status.HTTP_204_NO_CONTENT,
    description="Elimina permanentemente una parcela de la base de datos")
async def delete_plot_permanent_endpoint(
    plot_id: int, 
    db: AsyncSession = Depends(get_db)
):
    try:
        result = await delete_plot_permanent(db, plot_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela no encontrada"
            )
        return None
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al eliminar permanentemente parcela {plot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al eliminar permanentemente la parcela"
        )

@router.patch("/{plot_id}/archive", 
    response_model=PlotResponse,
    description="Archiva una parcela cambiando su estado a inactivo")
async def archive_plot_endpoint(
    plot_id: int, 
    db: AsyncSession = Depends(get_db)
):
    try:
        return await archive_plot(db, plot_id)
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al archivar parcela {plot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al archivar la parcela"
        )

# Endpoints adicionales útiles

@router.patch("/{plot_id}/activate", 
    response_model=PlotResponse,
    description="Activa una parcela previamente desactivada")
async def activate_plot(
    plot_id: int, 
    db: AsyncSession = Depends(get_db)
):
    try:
        plot = await get_plot(db, plot_id)
        if plot is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parcela no encontrada"
            )
        return await update_plot(db, plot_id, PlotUpdate(active=True))
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error al activar parcela {plot_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al activar la parcela"
        )

@router.get("/statistics/summary",
    description="Obtiene estadísticas generales de las parcelas")
async def get_plot_statistics(
    db: AsyncSession = Depends(get_db)
):
    try:
        # Implementar lógica para obtener estadísticas
        # Por ejemplo: total de área, cantidad por variedad, etc.
        pass
    except Exception as e:
        logger.error(f"Error al obtener estadísticas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener estadísticas"
        )
