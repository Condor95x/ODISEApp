from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Convertir la URL para que funcione tanto en local como en Heroku
def get_database_url():
    """Convierte la URL para compatibilidad con asyncpg en todos los entornos"""
    url = settings.DATABASE_URL
    
    # Para Heroku: postgres:// → postgresql+asyncpg://
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    
    # Para desarrollo local: postgresql:// → postgresql+asyncpg://
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    
    # Si ya tiene el formato correcto, devolverlo tal como está
    return url

DATABASE_URL = get_database_url()

# Solo mostrar logs en desarrollo (no en producción)
import os
if os.getenv("ENVIRONMENT") != "production":
    print(f"🔍 DATABASE_URL configurada: {DATABASE_URL[:50]}...")

engine = create_async_engine(DATABASE_URL, future=True, echo=False)  # echo=False para producción
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session