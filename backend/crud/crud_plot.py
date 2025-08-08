from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload
from geoalchemy2 import WKTElement
from fastapi import HTTPException
from typing import List
from ..models import Plot, Grapevine
from ..schemas.schemas_plot import PlotCreate, PlotUpdate, PlotResponse
import logging
from shapely.geometry import shape
from geoalchemy2.elements import WKTElement
from geoalchemy2.shape import to_shape
from shapely.wkt import dumps

logger = logging.getLogger(__name__)

##Funciones para las parcelas

async def validate_grapevine(db: AsyncSession, grapevine_id: str) -> bool:
    """Valida que una variedad/portainjerto existe en la base de datos."""
    result = await db.execute(
        select(Grapevine).where(Grapevine.gv_id == grapevine_id)
    )
    return result.scalar() is not None

async def create_plot(db: AsyncSession, plot: PlotCreate) -> PlotResponse:
    try:
        logger.debug(f"Creando parcela con datos: {plot.dict()}")

        # Validar que la variedad existe
        if not await validate_grapevine(db, plot.plot_var):
            logger.error(f"Variedad no encontrada: {plot.plot_var}")
            raise HTTPException(status_code=400, detail="Variedad no encontrada")

        # Validar el portainjerto si se proporciona
        if plot.plot_rootstock and not await validate_grapevine(db, plot.plot_rootstock):
            logger.error(f"Portainjerto no encontrado: {plot.plot_rootstock}")
            raise HTTPException(status_code=400, detail="Portainjerto no encontrado")

        # Crear la geometría WKT
        geom = WKTElement(plot.plot_geom, srid=4326)

        db_plot = Plot(
            plot_name=plot.plot_name,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
            plot_geom=geom,
            plot_area=plot.plot_area
        )

        db.add(db_plot)
        await db.commit()
        await db.refresh(db_plot)

        # Convertir WKTElement a WKT
        if db_plot.plot_geom:
            shape = to_shape(db_plot.plot_geom)
            db_plot.plot_geom = dumps(shape)

        return PlotResponse.from_orm(db_plot)

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error en la base de datos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    except Exception as e:
        logger.error(f"Error inesperado: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")

async def get_plots(db: AsyncSession, active_only: bool = True) -> List[PlotResponse]:
    """
    Obtiene todas las parcelas con información relacionada.
    Args:
        active_only: Si True, solo devuelve parcelas activas
    """
    try:
        query = select(Plot).options(
            joinedload(Plot.plot_var_relationship),
            joinedload(Plot.plot_rootstock_relationship)
        )
        
        if active_only:
            query = query.where(Plot.active == True)

        result = await db.execute(query)
        plots = result.unique().scalars().all()

        plot_responses = []
        for plot in plots:
            geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
            plot_responses.append(
                PlotResponse(
                    plot_id=plot.plot_id,
                    plot_name=plot.plot_name,
                    plot_var=plot.plot_var,
                    plot_geom=geom_wkt,
                    plot_area=float(plot.plot_area) if plot.plot_area else None,
                    variety_name=plot.plot_var_relationship.name if plot.plot_var_relationship else None,
                    rootstock_name=plot.plot_rootstock_relationship.name if plot.plot_rootstock_relationship else None,
                    plot_rootstock=plot.plot_rootstock,
                    plot_implant_year=plot.plot_implant_year,
                    plot_creation_year=plot.plot_creation_year,
                    plot_conduction=plot.plot_conduction,
                    plot_management=plot.plot_management,
                    plot_description=plot.plot_description,
                    active=plot.active,
                )
            )
        return plot_responses

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcelas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener las parcelas")

async def get_plot(
        db: AsyncSession,
        plot_id: int
        ) -> PlotResponse:
    """
    Obtiene una parcela específica por ID.
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        result = await db.execute(
            select(Plot)
            .options(
                joinedload(Plot.plot_var_relationship),
                joinedload(Plot.plot_rootstock_relationship)
            )
            .where(Plot.plot_id == plot_id)
        )
        plot = result.unique().scalar_one_or_none()
        
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la parcela")

async def update_plot(db: AsyncSession, plot_id: int, plot_update: PlotUpdate) -> PlotResponse:
    """
    Actualiza una parcela existente.
    Raises:
        HTTPException: Si la parcela no existe o hay errores de validación
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        update_data = plot_update.dict(exclude_unset=True)
        
        # Validar variedad y portainjerto si se están actualizando
        if 'plot_var' in update_data:
            if not await validate_grapevine(db, update_data['plot_var']):
                raise HTTPException(status_code=400, detail="Variedad no encontrada")
                
        if 'plot_rootstock' in update_data:
            if update_data['plot_rootstock'] and not await validate_grapevine(db, update_data['plot_rootstock']):
                raise HTTPException(status_code=400, detail="Portainjerto no encontrado")

        # Manejar la geometría separadamente
        if 'plot_geom' in update_data:
            try:
                update_data['plot_geom'] = WKTElement(update_data['plot_geom'], srid=4326)
            except Exception as e:
                logger.error(f"Error al procesar geometría: {e}")
                raise HTTPException(status_code=400, detail="Geometría inválida")

        for key, value in update_data.items():
            setattr(plot, key, value)

        await db.commit()
        await db.refresh(plot)

        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al actualizar parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar la parcela")

async def delete_plot_permanent(db: AsyncSession, plot_id: int) -> bool:
    """
    Elimina permanentemente una parcela de la base de datos.
    Returns:
        bool: True si se eliminó correctamente
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        # Borrado físico de la base de datos
        await db.delete(plot)
        await db.commit()
        return True

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al eliminar permanentemente parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar la parcela")

async def archive_plot(db: AsyncSession, plot_id: int) -> PlotResponse:
    """
    Archiva una parcela cambiando su estado a inactivo.
    Returns:
        PlotResponse: La parcela actualizada
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        # Cambiar estado a inactivo
        plot.active = False
        await db.commit()
        await db.refresh(plot)

        # Obtener geometría en formato WKT para la respuesta
        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al archivar parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al archivar la parcela")

async def get_plots(db: AsyncSession, active_only: bool = True) -> List[PlotResponse]:
    """
    Obtiene todas las parcelas con información relacionada.
    Args:
        active_only: Si True, solo devuelve parcelas activas
    """
    try:
        query = select(Plot).options(
            joinedload(Plot.plot_var_relationship),
            joinedload(Plot.plot_rootstock_relationship)
        )
        
        if active_only:
            query = query.where(Plot.active == True)

        result = await db.execute(query)
        plots = result.unique().scalars().all()

        plot_responses = []
        for plot in plots:
            geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
            plot_responses.append(
                PlotResponse(
                    plot_id=plot.plot_id,
                    plot_name=plot.plot_name,
                    plot_var=plot.plot_var,
                    plot_geom=geom_wkt,
                    plot_area=float(plot.plot_area) if plot.plot_area else None,
                    variety_name=plot.plot_var_relationship.name if plot.plot_var_relationship else None,
                    rootstock_name=plot.plot_rootstock_relationship.name if plot.plot_rootstock_relationship else None,
                    plot_rootstock=plot.plot_rootstock,
                    plot_implant_year=plot.plot_implant_year,
                    plot_creation_year=plot.plot_creation_year,
                    plot_conduction=plot.plot_conduction,
                    plot_management=plot.plot_management,
                    plot_description=plot.plot_description,
                    active=plot.active,
                )
            )
        return plot_responses

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcelas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener las parcelas")

async def get_plot(db: AsyncSession, plot_id: int) -> PlotResponse:
    """
    Obtiene una parcela específica por ID.
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        result = await db.execute(
            select(Plot)
            .options(
                joinedload(Plot.plot_var_relationship),
                joinedload(Plot.plot_rootstock_relationship)
            )
            .where(Plot.plot_id == plot_id)
        )
        plot = result.unique().scalar_one_or_none()
        
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener la parcela")

async def update_plot(db: AsyncSession, plot_id: int, plot_update: PlotUpdate) -> PlotResponse:
    """
    Actualiza una parcela existente.
    Raises:
        HTTPException: Si la parcela no existe o hay errores de validación
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        update_data = plot_update.dict(exclude_unset=True)
        
        # Validar variedad y portainjerto si se están actualizando
        if 'plot_var' in update_data:
            if not await validate_grapevine(db, update_data['plot_var']):
                raise HTTPException(status_code=400, detail="Variedad no encontrada")
                
        if 'plot_rootstock' in update_data:
            if update_data['plot_rootstock'] and not await validate_grapevine(db, update_data['plot_rootstock']):
                raise HTTPException(status_code=400, detail="Portainjerto no encontrado")

        # Manejar la geometría separadamente
        if 'plot_geom' in update_data:
            try:
                update_data['plot_geom'] = WKTElement(update_data['plot_geom'], srid=4326)
            except Exception as e:
                logger.error(f"Error al procesar geometría: {e}")
                raise HTTPException(status_code=400, detail="Geometría inválida")

        for key, value in update_data.items():
            setattr(plot, key, value)

        await db.commit()
        await db.refresh(plot)

        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al actualizar parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al actualizar la parcela")

async def delete_plot_permanent(db: AsyncSession, plot_id: int) -> bool:
    """
    Elimina permanentemente una parcela de la base de datos.
    Returns:
        bool: True si se eliminó correctamente
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        # Borrado físico de la base de datos
        await db.delete(plot)
        await db.commit()
        return True

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al eliminar permanentemente parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al eliminar la parcela")

async def archive_plot(db: AsyncSession, plot_id: int) -> PlotResponse:
    """
    Archiva una parcela cambiando su estado a inactivo.
    Returns:
        PlotResponse: La parcela actualizada
    Raises:
        HTTPException: Si la parcela no existe
    """
    try:
        plot = await db.get(Plot, plot_id)
        if not plot:
            raise HTTPException(status_code=404, detail="Parcela no encontrada")

        # Cambiar estado a inactivo
        plot.active = False
        await db.commit()
        await db.refresh(plot)

        # Obtener geometría en formato WKT para la respuesta
        geom_wkt = await db.scalar(func.ST_AsText(plot.plot_geom))
        
        return PlotResponse(
            plot_id=plot.plot_id,
            plot_name=plot.plot_name,
            plot_geom=geom_wkt,
            plot_area=float(plot.plot_area) if plot.plot_area else None,
            plot_var=plot.plot_var,
            plot_rootstock=plot.plot_rootstock,
            plot_implant_year=plot.plot_implant_year,
            plot_creation_year=plot.plot_creation_year,
            plot_conduction=plot.plot_conduction,
            plot_management=plot.plot_management,
            plot_description=plot.plot_description,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al archivar parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al archivar la parcela")
