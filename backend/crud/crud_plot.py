from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.sql import func, and_, or_
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload, selectinload, aliased
from geoalchemy2 import WKTElement
from fastapi import HTTPException
from typing import List, Optional
from ..models import Plot, Grapevine, Vineyard, Sector, Finca
from ..schemas.schemas_plot import (
    PlotCreate, PlotUpdate, PlotResponse, PlotResponseOptimized,
    PlotsWithMetadata, PlotMetadata, GrapevineInfo,GrapevineInfoData, VineyardInfo,
    VineyardInfoData, SectorInfo, SectorInfoData, FincaInfo, FincaInfoData, PlotFilters
)
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
            sector_id=plot.sector_id,
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
            sector_id=plot.sector_id,
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
            sector_id=plot.sector_id,
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
                    sector_id=plot.sector_id,
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
            sector_id=plot.sector_id,
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
            sector_id=plot.sector_id,
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
            sector_id=plot.sector_id,
            active=plot.active,
        )

    except SQLAlchemyError as e:
        await db.rollback()
        logger.error(f"Error al archivar parcela {plot_id}: {e}")
        raise HTTPException(status_code=500, detail="Error al archivar la parcela")

##CRUDS plots optimizados

async def validate_grapevine(db: AsyncSession, grapevine_id: str) -> bool:
    """Valida que una variedad/portainjerto existe en la base de datos."""
    result = await db.execute(
        select(Grapevine).where(Grapevine.gv_id == grapevine_id)
    )
    return result.scalar() is not None

async def get_metadata(db: AsyncSession) -> PlotMetadata:
    """Obtiene todos los metadatos necesarios para el frontend"""
    try:
        # Obtener variedades (solo las que son variedades, no portainjertos)
        varieties_result = await db.execute(
            select(Grapevine).where(Grapevine.gv_id.ilike('M%'))
        )
        varieties = varieties_result.scalars().all()
        
        # Obtener portainjertos
        rootstocks_result = await db.execute(
            select(Grapevine).where(Grapevine.gv_id.ilike('PI%'))
        )
        rootstocks = rootstocks_result.scalars().all()
        
        # Obtener sistemas de conducción y manejo
        vineyard_result = await db.execute(select(Vineyard))
        vineyard_data = vineyard_result.scalars().all()
        
        # Separar por tipo (asumiendo que tienes algún campo que los diferencie)
        conduction_systems = [v for v in vineyard_data if 'conduction' in v.description.lower() if v.description]
        management_types = [v for v in vineyard_data if 'management' in v.description.lower() if v.description]
        
        #obtener fincas y sectores
        finca_result=await db.execute(select(Finca))
        finca_data = finca_result.scalars().all()

        sector_result=await db.execute(select(Sector))
        sector_data = sector_result.scalars().all()

        return PlotMetadata(
            varieties=[GrapevineInfo(
                gv_id=v.gv_id,
                name=v.name,
                color=v.color,
                gv_type=v.gv_type
            ) for v in varieties],
            rootstocks=[GrapevineInfo(
                gv_id=r.gv_id,
                name=r.name,
                color=r.color,
                gv_type=r.gv_type
            ) for r in rootstocks],
            conduction_systems=[VineyardInfo(
                vy_id=c.vy_id,
                value=c.value,
                description=c.description
            ) for c in conduction_systems],
            management_types=[VineyardInfo(
                vy_id=m.vy_id,
                value=m.value,
                description=m.description
            ) for m in management_types],
            sectores=[SectorInfo(
                id=s.sector_id,
                value=s.value,
                finca=s.finca_id,
                etiqueta=s.etiqueta,
                description =s.description
            ) for s in sector_data],
            fincas=[FincaInfo(
                id=f.finca_id,
                value=f.value,
                description=f.description            
            ) for f in finca_data],
        )
    except SQLAlchemyError as e:
        logger.error(f"Error al obtener metadatos: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener metadatos")

async def get_plots_optimized(
    db: AsyncSession, 
    filters: PlotFilters = None
) -> PlotsWithMetadata:
    """
    Obtiene todas las parcelas con información relacionada de manera optimizada.
    Una sola consulta con todos los JOINs necesarios.
    """
    try:
        # Crear alias para las tablas
        variety_alias = aliased(Grapevine, name='variety_alias')
        rootstock_alias = aliased(Grapevine, name='rootstock_alias')
        conduction_alias = aliased(Vineyard, name='conduction_alias')
        management_alias = aliased(Vineyard, name='management_alias')
        sector_alias = aliased(Sector, name='sector_alias')
        finca_alias = aliased(Finca, name='finca_alias')

        # Construir la consulta principal correctamente
        query = select(
            Plot,
            variety_alias,
            rootstock_alias,
            conduction_alias,
            management_alias,
            sector_alias,
            finca_alias
        ).join(
            variety_alias, Plot.plot_var == variety_alias.gv_id
        ).outerjoin(
            rootstock_alias, Plot.plot_rootstock == rootstock_alias.gv_id
        ).outerjoin(
            conduction_alias, Plot.plot_conduction == conduction_alias.vy_id
        ).outerjoin(
            management_alias, Plot.plot_management == management_alias.vy_id
        ).outerjoin(
            sector_alias, Plot.sector_id == sector_alias.sector_id  # NUEVO JOIN
        ).outerjoin(
            finca_alias, sector_alias.finca_id == finca_alias.finca_id  # NUEVO JOIN
        )
        
        # Aplicar filtros
        if filters:
            if filters.active_only is not None:
                query = query.where(Plot.active == filters.active_only)
            
            if filters.filter_field and filters.filter_value:
                filter_value = f"%{filters.filter_value.lower()}%"
                if filters.filter_field == "plot_name":
                    query = query.where(Plot.plot_name.ilike(filter_value))
                elif filters.filter_field == "variety_name":
                    query = query.where(variety_alias.name.ilike(filter_value))
                elif filters.filter_field == "rootstock_name":
                    query = query.where(rootstock_alias.name.ilike(filter_value))
                elif filters.filter_field == "sector_name":
                    query = query.where(sector_alias.value.ilike(filter_value))
                elif filters.filter_field == "finca_name":
                    query = query.where(finca_alias.value.ilike(filter_value))

            if filters.variety_ids:
                query = query.where(Plot.plot_var.in_(filters.variety_ids))
            
            if filters.rootstock_ids:
                query = query.where(Plot.plot_rootstock.in_(filters.rootstock_ids))
            
            if filters.min_area:
                query = query.where(Plot.plot_area >= filters.min_area)
            
            if filters.max_area:
                query = query.where(Plot.plot_area <= filters.max_area)
            
            if filters.implant_year_from:
                query = query.where(Plot.plot_implant_year >= filters.implant_year_from)
            
            if filters.implant_year_to:
                query = query.where(Plot.plot_implant_year <= filters.implant_year_to)

        # Obtener los conteos y resultados
        total_count_query = select(func.count()).select_from(Plot)
        if filters and filters.active_only is not None:
            total_count_query = total_count_query.where(Plot.active == filters.active_only)
        
        total_count = (await db.execute(total_count_query)).scalar()
        
        filtered_count_query = select(func.count()).select_from(query.alias())
        filtered_count = (await db.execute(filtered_count_query)).scalar()
        
        result = await db.execute(query)
        rows = result.all()

        plots_optimized = []
        for row in rows:
            plot_data, variety_data, rootstock_data, conduction_data, management_data, sector_data, finca_data = row
            
            plots_optimized.append(PlotResponseOptimized(
                plot_id=plot_data.plot_id,
                plot_name=plot_data.plot_name,
                plot_geom=str(plot_data.plot_geom),
                plot_area=float(plot_data.plot_area) if plot_data.plot_area else None,
                plot_implant_year=plot_data.plot_implant_year,
                plot_creation_year=plot_data.plot_creation_year,
                plot_description=plot_data.plot_description,
                #sector_id=plot_data.sector_id,
                active=plot_data.active,
                variety=GrapevineInfoData(gv_id=variety_data.gv_id, name=variety_data.name),
                rootstock=GrapevineInfoData(gv_id=rootstock_data.gv_id, name=rootstock_data.name) if rootstock_data else None,
                conduction=VineyardInfoData(vy_id=conduction_data.vy_id, value=conduction_data.value) if conduction_data else None,
                management=VineyardInfoData(vy_id=management_data.vy_id, value=management_data.value) if management_data else None,
                sector=SectorInfoData(etiqueta=sector_data.etiqueta)
            ))

        metadata = await get_metadata(db)
        
        return PlotsWithMetadata(
            plots=plots_optimized,
            metadata=metadata,
            total_count=total_count,
            filtered_count=filtered_count
        )

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcelas optimizadas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener las parcelas")

async def get_onlyplots_optimized(
    db: AsyncSession, 
    filters: PlotFilters = None
) -> PlotsWithMetadata:
    """
    Obtiene todas las parcelas con información relacionada de manera optimizada.
    Una sola consulta con todos los JOINs necesarios.
    """
    try:
        # Crear alias para las tablas
        variety_alias = aliased(Grapevine, name='variety_alias')
        rootstock_alias = aliased(Grapevine, name='rootstock_alias')
        conduction_alias = aliased(Vineyard, name='conduction_alias')
        management_alias = aliased(Vineyard, name='management_alias')
        sector_alias = aliased(Sector, name='sector_alias')
        finca_alias = aliased(Finca, name='finca_alias')

        # Construir la consulta principal - cambio a LEFT JOIN para variety también
        query = select(
            Plot,
            variety_alias,
            rootstock_alias,
            conduction_alias,
            management_alias,
            sector_alias,
            finca_alias
        ).outerjoin(  # Cambio de join() a outerjoin() para variety
            variety_alias, Plot.plot_var == variety_alias.gv_id
        ).outerjoin(
            rootstock_alias, Plot.plot_rootstock == rootstock_alias.gv_id
        ).outerjoin(
            conduction_alias, Plot.plot_conduction == conduction_alias.vy_id
        ).outerjoin(
            management_alias, Plot.plot_management == management_alias.vy_id
        ).outerjoin(
            sector_alias, Plot.sector_id == sector_alias.sector_id
        ).outerjoin(
            finca_alias, sector_alias.finca_id == finca_alias.id
        )
        
        # Aplicar filtros
        if filters:
            if filters.active_only is not None:
                query = query.where(Plot.active == filters.active_only)
            
            if filters.filter_field and filters.filter_value:
                filter_value = f"%{filters.filter_value.lower()}%"
                if filters.filter_field == "plot_name":
                    query = query.where(Plot.plot_name.ilike(filter_value))
                elif filters.filter_field == "variety_name":
                    query = query.where(variety_alias.name.ilike(filter_value))
                elif filters.filter_field == "rootstock_name":
                    query = query.where(rootstock_alias.name.ilike(filter_value))
                elif filters.filter_field == "sector_name":
                    query = query.where(sector_alias.value.ilike(filter_value))
                elif filters.filter_field == "finca_name":
                    query = query.where(finca_alias.value.ilike(filter_value))

            if filters.variety_ids:
                query = query.where(Plot.plot_var.in_(filters.variety_ids))
            
            if filters.rootstock_ids:
                query = query.where(Plot.plot_rootstock.in_(filters.rootstock_ids))
            
            if filters.min_area:
                query = query.where(Plot.plot_area >= filters.min_area)
            
            if filters.max_area:
                query = query.where(Plot.plot_area <= filters.max_area)
            
            if filters.implant_year_from:
                query = query.where(Plot.plot_implant_year >= filters.implant_year_from)
            
            if filters.implant_year_to:
                query = query.where(Plot.plot_implant_year <= filters.implant_year_to)

        # Obtener los conteos y resultados
        total_count_query = select(func.count()).select_from(Plot)
        if filters and filters.active_only is not None:
            total_count_query = total_count_query.where(Plot.active == filters.active_only)
        
        total_count = (await db.execute(total_count_query)).scalar()
        
        filtered_count_query = select(func.count()).select_from(query.alias())
        filtered_count = (await db.execute(filtered_count_query)).scalar()
        
        result = await db.execute(query)
        rows = result.all()

        plots_optimized = []
        for row in rows:
            plot_data, variety_data, rootstock_data, conduction_data, management_data, sector_data, finca_data = row
            
            # Construir información del sector
            sector_info = None
            if sector_data:
                finca_info = None
                if finca_data:
                    finca_info = FincaInfoData(
                        id=finca_data.sector_id,
                        value=finca_data.value
                    )
                
                sector_info = SectorInfoData(
                    id=sector_data.sector_id,
                    value=sector_data.value,
                    finca=finca_info
                )

            # Construir la respuesta usando el schema actualizado
            plots_optimized.append(PlotResponseOptimized(
                plot_id=plot_data.plot_id,
                plot_name=plot_data.plot_name,
                plot_geom=str(plot_data.plot_geom) if plot_data.plot_geom else None,
                plot_area=float(plot_data.plot_area) if plot_data.plot_area else None,
                plot_implant_year=plot_data.plot_implant_year,
                plot_creation_year=plot_data.plot_creation_year,
                plot_description=plot_data.plot_description,
                sector_id=plot_data.sector_id,
                active=plot_data.active,
                # Ahora variety es Optional, así que puede ser None
                variety=GrapevineInfoData(gv_id=variety_data.gv_id, name=variety_data.name) if variety_data else None,
                rootstock=GrapevineInfoData(gv_id=rootstock_data.gv_id, name=rootstock_data.name) if rootstock_data else None,
                conduction=VineyardInfoData(vy_id=conduction_data.vy_id, value=conduction_data.value) if conduction_data else None,
                management=VineyardInfoData(vy_id=management_data.vy_id, value=management_data.value) if management_data else None,
                sector=sector_info
            ))

        metadata = await get_metadata(db)
        
        return PlotsWithMetadata(
            plots=plots_optimized,
            metadata=metadata,
            total_count=total_count,
            filtered_count=filtered_count
        )

    except SQLAlchemyError as e:
        logger.error(f"Error al obtener parcelas optimizadas: {e}")
        raise HTTPException(status_code=500, detail="Error al obtener las parcelas")
