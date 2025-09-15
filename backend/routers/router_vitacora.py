from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession # Asegúrate de importar esto
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, select, func # Importa select
from typing import List, Optional
from datetime import datetime
import io
from PIL import Image
import zipfile
import tempfile
import os

from ..database import get_db  # Asume que esta función devuelve una AsyncSession
from ..models import CategoriaImagenes, VitacoraCampo
from ..schemas.schemas_VitacoraDeCampo import (
    CategoriaImagenesCreate, CategoriaImagenesUpdate, CategoriaImagenesResponse,
    VitacoraCampoCreate, VitacoraCampoUpdate, VitacoraCampoResponse, VitacoraCampoListResponse
)
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# RUTAS PARA CATEGORÍAS DE IMÁGENES

@router.get("/categorias-imagenes/", response_model=List[CategoriaImagenesResponse])
async def get_categorias_imagenes( # Haz la función async
    skip: int = 0,
    limit: int = 100,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db) # Asegúrate de que get_db devuelve AsyncSession
):
    stmt = select(CategoriaImagenes) # Usa select()
    if activo is not None:
        stmt = stmt.filter(CategoriaImagenes.activo == activo)
    
    # Ejecuta la consulta de forma asíncrona
    categorias = await db.execute(stmt.offset(skip).limit(limit))
    
    # .all() en el resultado de execute devuelve una lista de tuplas, necesitas extraer los objetos
    return [row[0] for row in categorias.all()] # Extrae el primer elemento de cada tupla

@router.get("/categorias-imagenes/{categoria_id}", response_model=CategoriaImagenesResponse)
async def get_categoria_imagen(categoria_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(CategoriaImagenes).filter(CategoriaImagenes.id_categoria_img == categoria_id)
    categoria = await db.scalar(stmt) # Usa scalar() para obtener un solo objeto o None
    
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return categoria

@router.post("/categorias-imagenes/", response_model=CategoriaImagenesResponse)
async def create_categoria_imagen(categoria: CategoriaImagenesCreate, db: AsyncSession = Depends(get_db)):
    # Verificar si ya existe una categoría con el mismo nombre
    stmt_existing = select(CategoriaImagenes).filter(CategoriaImagenes.nombre == categoria.nombre)
    existing = await db.scalar(stmt_existing)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    db_categoria = CategoriaImagenes(**categoria.dict())
    db.add(db_categoria)
    await db.commit() # Usa await db.commit()
    await db.refresh(db_categoria)
    return db_categoria

@router.put("/categorias-imagenes/{categoria_id}", response_model=CategoriaImagenesResponse)
async def update_categoria_imagen(
    categoria_id: int, 
    categoria_update: CategoriaImagenesUpdate, 
    db: AsyncSession = Depends(get_db)
):
    stmt = select(CategoriaImagenes).filter(CategoriaImagenes.id_categoria_img == categoria_id)
    categoria = await db.scalar(stmt)
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    update_data = categoria_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(categoria, field, value)
    
    await db.commit()
    await db.refresh(categoria)
    return categoria

@router.delete("/categorias-imagenes/{categoria_id}")
async def delete_categoria_imagen(categoria_id: int, db: AsyncSession = Depends(get_db)):
    # Verificar si la categoría tiene imágenes asociadas
    stmt_count = select(func.count(VitacoraCampo.id_vitacora)).filter(VitacoraCampo.id_categoria_img == categoria_id)
    imagenes_count = await db.scalar(stmt_count)
    
    if imagenes_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar la categoría porque tiene {imagenes_count} imágenes asociadas"
        )
    
    stmt_categoria = select(CategoriaImagenes).filter(CategoriaImagenes.id_categoria_img == categoria_id)
    categoria = await db.scalar(stmt_categoria)
    if categoria is None:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    await db.delete(categoria)
    await db.commit()
    return {"message": "Categoría eliminada exitosamente"}

# RUTAS PARA IMÁGENES DE VITÁCORA

@router.get("/vitacora-campo/", response_model=List[VitacoraCampoListResponse])
async def get_vitacora_campo(
    skip: int = 0,
    limit: int = 100,
    categoria_id: Optional[int] = None,
    activo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    # Construye la consulta usando select y join
    stmt = (
        select(
            VitacoraCampo.id_vitacora,
            VitacoraCampo.nombre_archivo,
            VitacoraCampo.tipo_mime,
            VitacoraCampo.tamaño_archivo,
            VitacoraCampo.fecha_creacion,
            VitacoraCampo.fecha_captura,
            VitacoraCampo.descripcion,
            VitacoraCampo.activo,
            CategoriaImagenes.nombre.label('categoria_nombre'),
            CategoriaImagenes.id_categoria_img.label('categoria_id')
        )
        .join(CategoriaImagenes, VitacoraCampo.id_categoria_img == CategoriaImagenes.id_categoria_img) # Especifica la condición de join
    )
    
    if categoria_id:
        stmt = stmt.filter(VitacoraCampo.id_categoria_img == categoria_id)
    if activo is not None:
        stmt = stmt.filter(VitacoraCampo.activo == activo)
    
    # Ejecuta la consulta y ordena
    resultados = await db.execute(stmt.order_by(desc(VitacoraCampo.fecha_creacion)).offset(skip).limit(limit))
    
    # Mapea los resultados al modelo de respuesta
    return [
        VitacoraCampoListResponse(
            id_vitacora=r.id_vitacora,
            nombre_archivo=r.nombre_archivo,
            tipo_mime=r.tipo_mime,
            tamaño_archivo=r.tamaño_archivo,
            fecha_creacion=r.fecha_creacion,
            fecha_captura=r.fecha_captura,
            descripcion=r.descripcion,
            activo=r.activo,
            categoria_nombre=r.categoria_nombre,
            categoria_id=r.categoria_id
        )
        for r in resultados.all() # Usa .all() en el resultado de execute
    ]

@router.get("/vitacora-campo/{imagen_id}", response_model=VitacoraCampoResponse)
async def get_imagen_vitacora(imagen_id: int, db: AsyncSession = Depends(get_db)):
    # Usa select y joinedload para cargar la relación
    stmt = select(VitacoraCampo).options(joinedload(VitacoraCampo.categoria)).filter(VitacoraCampo.id_vitacora == imagen_id)
    imagen = await db.scalar(stmt)
    
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return imagen

@router.get("/vitacora-campo/{imagen_id}/imagen")
async def get_imagen_archivo(imagen_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(VitacoraCampo).filter(VitacoraCampo.id_vitacora == imagen_id)
    imagen = await db.scalar(stmt)
    
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    return Response(
        content=imagen.imagen,
        media_type=imagen.tipo_mime,
        headers={"Content-Disposition": f"inline; filename={imagen.nombre_archivo}"}
    )

@router.post("/vitacora-campo/", response_model=VitacoraCampoResponse)
async def create_archivo_vitacora(  # Cambié el nombre para ser más genérico
    archivo: UploadFile = File(...),
    fecha_captura: str = Form(...),
    descripcion: str = Form(""),
    id_categoria_img: int = Form(...),
    db: AsyncSession = Depends(get_db)
):
    # Verificar que la categoría existe
    stmt_categoria = select(CategoriaImagenes).filter(CategoriaImagenes.id_categoria_img == id_categoria_img)
    categoria = await db.scalar(stmt_categoria)
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    # ✅ NUEVA VALIDACIÓN: Permitir imágenes Y PDFs
    allowed_types = [
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/tiff",
        "application/pdf"
    ]
    
    if archivo.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"Tipo de archivo no permitido. Tipos permitidos: {', '.join(allowed_types)}"
        )
    
    # ✅ VALIDACIÓN ADICIONAL: Tamaño máximo
    max_size = 10 * 1024 * 1024  # 10MB
    contenido = await archivo.read()
    
    if len(contenido) > max_size:
        raise HTTPException(
            status_code=400,
            detail="El archivo es demasiado grande. Tamaño máximo permitido: 10MB"
        )
    
    # Parsear fecha de captura
    try:
        fecha_captura_dt = datetime.fromisoformat(fecha_captura.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")
    
    # Crear el registro
    db_archivo = VitacoraCampo(
        imagen=contenido,  # Mantén el nombre de columna actual
        tipo_mime=archivo.content_type,
        nombre_archivo=archivo.filename,
        tamaño_archivo=len(contenido),
        fecha_captura=fecha_captura_dt,
        descripcion=descripcion,
        id_categoria_img=id_categoria_img
    )
    
    db.add(db_archivo)
    await db.commit()
    await db.refresh(db_archivo)
    
    # Cargar la relación con categoría para la respuesta
    stmt_refresh = select(VitacoraCampo).options(joinedload(VitacoraCampo.categoria)).filter(VitacoraCampo.id_vitacora == db_archivo.id_vitacora)
    archivo_con_categoria = await db.scalar(stmt_refresh)
    
    return archivo_con_categoria

@router.put("/vitacora-campo/{imagen_id}", response_model=VitacoraCampoResponse)
async def update_imagen_vitacora(
    imagen_id: int,
    imagen_update: VitacoraCampoUpdate,
    db: AsyncSession = Depends(get_db)
):
    stmt_imagen = select(VitacoraCampo).filter(VitacoraCampo.id_vitacora == imagen_id)
    imagen = await db.scalar(stmt_imagen)
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    update_data = imagen_update.dict(exclude_unset=True)
    
    # Validar categoría si se está actualizando
    if 'id_categoria_img' in update_data:
        stmt_categoria = select(CategoriaImagenes).filter(CategoriaImagenes.id_categoria_img == update_data['id_categoria_img'])
        categoria = await db.scalar(stmt_categoria)
        if not categoria:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    for field, value in update_data.items():
        setattr(imagen, field, value)
    
    await db.commit()
    await db.refresh(imagen)
    
    # Cargar la relación con categoría para la respuesta
    stmt_refresh = select(VitacoraCampo).options(joinedload(VitacoraCampo.categoria)).filter(VitacoraCampo.id_vitacora == imagen_id)
    imagen_con_categoria = await db.scalar(stmt_refresh)
    
    return imagen_con_categoria

@router.delete("/vitacora-campo/{imagen_id}")
async def delete_imagen_vitacora(imagen_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(VitacoraCampo).filter(VitacoraCampo.id_vitacora == imagen_id)
    imagen = await db.scalar(stmt)
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    
    await db.delete(imagen)
    await db.commit()
    return {"message": "Imagen eliminada exitosamente"}

@router.post("/vitacora-campo/descargar-zip")
async def descargar_imagenes_zip(
    imagen_ids: List[int], # Asumiendo que se pasan como JSON en el body
    db: AsyncSession = Depends(get_db)
):
    if not imagen_ids:
        raise HTTPException(status_code=400, detail="No se seleccionaron imágenes")
    
    # Obtener las imágenes con sus categorías
    stmt = (
        select(VitacoraCampo)
        .options(joinedload(VitacoraCampo.categoria))
        .filter(VitacoraCampo.id_vitacora.in_(imagen_ids))
    )
    imagenes = (await db.execute(stmt)).scalars().all() # Usar scalars() para obtener objetos directamente

    if not imagenes:
        raise HTTPException(status_code=404, detail="No se encontraron imágenes")
    
    # Crear archivo ZIP en memoria
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for imagen in imagenes:
            # Crear metadata para cada imagen
            metadata = f"""Fecha de creación: {imagen.fecha_creacion.strftime('%Y-%m-%d %H:%M:%S')}
Fecha de captura: {imagen.fecha_captura.strftime('%Y-%m-%d %H:%M:%S')}
Categoría: {imagen.categoria.nombre}
Descripción: {imagen.descripcion or 'Sin descripción'}

"""
            
            # Agregar archivo de metadata
            nombre_base = os.path.splitext(imagen.nombre_archivo)[0]
            extension = os.path.splitext(imagen.nombre_archivo)[1]
            
            metadata_filename = f"{nombre_base}_info.txt"
            zip_file.writestr(metadata_filename, metadata)
            
            # Agregar la imagen
            imagen_filename = f"{nombre_base}_{imagen.id_vitacora}{extension}"
            zip_file.writestr(imagen_filename, imagen.imagen)
    
    zip_buffer.seek(0)
    
    # Generar nombre del archivo ZIP
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    zip_filename = f"vitacora_imagenes_{timestamp}.zip"
    
    return StreamingResponse(
        io.BytesIO(zip_buffer.read()),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={zip_filename}"}
    )