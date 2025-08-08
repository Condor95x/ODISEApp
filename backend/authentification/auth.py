# auth.py
from datetime import timedelta, datetime
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from .security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    Token,
    UsuarioCreate,
    UsuarioInDB,
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from ..models import Usuario

router = APIRouter()

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = await create_access_token( # added await here.
        data={"sub": user.email, "rol": user.rol}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UsuarioInDB)
async def read_users_me(current_user: Usuario = Depends(get_current_user)):
    return current_user

@router.post("/register", response_model=UsuarioInDB)
async def register_user(user_data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # Verificar si el usuario ya existe
    result = await db.execute(select(Usuario).where(Usuario.email == user_data.email))
    db_user = result.scalars().first()

    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    # Crear nuevo usuario
    hashed_password = get_password_hash(user_data.password)
    db_user = Usuario(
        email=user_data.email,
        nombre=user_data.nombre,
        apellido=user_data.apellido,
        password=hashed_password,
        rol=user_data.rol,
        fecha_creacion=datetime.utcnow()
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user