from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from ..database import get_db
from ..schemas.schemas_plot import (
    PlotCreate, PlotUpdate, PlotResponse, PlotResponseOptimized,
    PlotsWithMetadata, PlotMetadata, PlotFilters
)
from ..crud.crud_plot import (
    create_plot, get_plots, get_plot, update_plot, delete_plot_permanent, 
    archive_plot, get_plots_optimized, get_metadata
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ENDPOINTS OPTIMIZADOS

@router.get("/data", 
    response_model=PlotsWithMetadata,
    description="Obtiene todas las parcelas con información completa y metadatos en una sola llamada")
async def get_plots_with_complete_data(
    active_only: bool = Query(True, description="Solo mostrar parcelas activas"),
    filter_field: Optional[str] = Query(None, description="Campo por el cual filtrar"),
    filter_value: Optional[str] = Query(None, description="Valor del filtro"),
    variety_ids: Optional[List[str]] = Query(None, description="IDs de variedades a filtrar"),
    rootstock_ids: Optional[List[str]] = Query(None, description="IDs de portainjertos a filtrar"),
    conduction_systems: Optional[List[str]] = Query(None, description="Sistemas de conducción"),
    management_types: Optional[List[str]] = Query(None, description="Tipos de manejo"),
    min_area: Optional[float] = Query(None, description="Área mínima"),
    max_area: Optional[float] = Query(None, description="Área máxima"),
    implant_year_from: Optional[int] = Query(None, description="Año de implantación desde"),
    implant_year_to: Optional[int] = Query(None, description="Año de implantación hasta"),
    db: AsyncSession = Depends(get_db)
    ):
    """
    Endpoint principal optimizado que reemplaza múltiples llamadas del frontend.
    Retorna parcelas con información completa + metadatos en una sola request.
    """
    try:
        filters = PlotFilters(
            active_only=active_only,
            filter_field=filter_field,
            filter_value=filter_value,
            variety_ids=variety_ids,
            rootstock_ids=rootstock_ids,
            conduction_systems=conduction_systems,
            management_types=management_types,
            min_area=min_area,
            max_area=max_area,
            implant_year_from=implant_year_from,
            implant_year_to=implant_year_to,
            db=db
        )

        result = await get_plots_optimized(db, filters)
        
        return result
        
    except HTTPException:
        # Re-raise HTTPExceptions from CRUD functions
        raise
    except Exception as e:
        logger.error(f"Error en endpoint get_plots_with_complete_data: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error interno del servidor al obtener las parcelas"
        )
    
@router.get("/metadata",
    response_model=PlotMetadata,
    description="Obtiene solo los metadatos")
async def get_plots_metadata(db: AsyncSession = Depends(get_db)):
    """
    Endpoint para obtener únicamente los metadatos necesarios para el frontend:
    - Variedades disponibles
    - Portainjertos disponibles  
    - Sistemas de conducción
    - Tipos de manejo
    """
    try:
        # Llamar a la función CRUD para obtener metadatos
        metadata = await get_metadata(db)
        
        return metadata
        
    except HTTPException:
        # Re-raise HTTPExceptions from CRUD functions
        raise
    except Exception as e:
        logger.error(f"Error en endpoint get_plots_metadata: {e}")
        raise HTTPException(
            status_code=500,
            detail="Error interno del servidor al obtener los metadatos"
        )

##Endpoints tradicionales

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

