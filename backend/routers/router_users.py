from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from ..database import get_db
from ..authentification.security import get_current_user
from ..models import Usuario
from ..schemas.schemas_users import UserResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", 
            response_model=UserResponse,
            description="Obtiene información del usuario actual")
async def read_current_user(current_user: Usuario = Depends(get_current_user)):
    """
    Endpoint para obtener información del usuario autenticado actual
    """
    try:
        return UserResponse(
            id=current_user.id,
            nombre=current_user.nombre,
            apellido=current_user.apellido,
            rol=current_user.rol
        )
    except Exception as e:
        logger.error(f"Error al obtener usuario actual: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener información del usuario"
        )

@router.get("/", 
            response_model=List[UserResponse],
            description="Obtiene todos los usuarios")
async def read_users(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Usuario))
        usuarios = result.scalars().all()

        # Convertir objetos Usuario a UserResponse
        user_responses = [
            UserResponse(
                id=usuario.id,
                nombre=usuario.nombre,
                apellido=usuario.apellido,
                rol=usuario.rol
            )
            for usuario in usuarios
        ]

        return user_responses

    except Exception as e:
        logger.error(f"Error al obtener usuarios: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al obtener los usuarios"
        )
