from .routers import operaciones_router, router_plot, router_grapevines, router_vineyard ,router_inventory, router_users,router_tasklist,router_winery, router_bot
from fastapi import FastAPI
from contextlib import asynccontextmanager
from .authentification import auth
from .database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(lifespan=lifespan)

# CORS dinámico para desarrollo y producción
def get_cors_origins():
    """Configurar CORS según el entorno"""
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1",
    ]
    
    # Agregar dominio de Heroku en producción
    heroku_app_url = os.getenv("APP_URL")
    if heroku_app_url:
        # Añade la URL del backend con el prefijo HTTPS si no lo tiene
        if not heroku_app_url.startswith("https://"):
            origins.append(f"https://{heroku_app_url}")
        else:
            origins.append(heroku_app_url)
    
    # Agrega la URL específica del frontend que está causando el error
    frontend_origin = "https://odiseapp-bf4d8516bab4.herokuapp.com"
    if frontend_origin not in origins:
        origins.append(frontend_origin)

    return origins

# 💡 Mueve el middleware de CORS aquí, antes de cualquier router
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ahora incluye tus routers
app.include_router(router_bot.router, tags=["bot"])
app.include_router(router_winery.router, prefix="/winery", tags=["winery"])
app.include_router(router_inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(router_tasklist.router, prefix="/task", tags=["task"])
app.include_router(router_users.router, prefix="/users", tags=["users"])
app.include_router(auth.router,prefix="/auth", tags=["auth"])
app.include_router(router_plot.router, prefix="/plots", tags=["plots"])
app.include_router(router_grapevines.router, prefix="/grapevines", tags=["grapevines"])
app.include_router(router_vineyard.router, prefix="/vineyard", tags=["vineyard"])
app.include_router(operaciones_router.router, prefix="/operaciones", tags=["operaciones"])

# Servir frontend estático
# Ajustar el path para que funcione tanto en desarrollo como en producción
frontend_path = "frontend/build"  # Path relativo desde la raíz del proyecto

# Solo montar archivos estáticos si el directorio existe (en producción)
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "static")), name="static")
    
    # Servir archivos de assets (CSS, JS, imágenes, etc.)
    @app.get("/static/{full_path:path}")
    async def serve_static_files(full_path: str):
        """Servir archivos estáticos del build de React"""
        file_path = os.path.join(frontend_path, "static", full_path)
        if os.path.exists(file_path):
            return FileResponse(file_path)
        return {"error": "File not found"}
    
    # Servir manifest.json, favicon.ico, etc.
    @app.get("/{filename:path}")
    async def serve_root_assets(filename: str):
        """Servir archivos en la raíz como manifest.json, favicon.ico, etc."""
        # Lista de archivos permitidos en la raíz
        allowed_files = [
            "manifest.json", "favicon.ico", "robots.txt", "logo192.png", 
            "logo512.png", "asset-manifest.json"
        ]
        
        if filename in allowed_files:
            file_path = os.path.join(frontend_path, filename)
            if os.path.exists(file_path):
                return FileResponse(file_path)
        
        # Para todas las demás rutas (SPA routing), servir index.html
        index_file = os.path.join(frontend_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        
        return {"error": "Frontend not built"}

    @app.get("/")
    def read_root():
        """Servir la aplicación React en la raíz"""
        index_file = os.path.join(frontend_path, "index.html")
        return FileResponse(index_file)
else:
    # En desarrollo local, solo API
    @app.get("/")
    def read_root():
        return {"message": "ODISEApp API - Desarrollo"}

@app.get("/{full_path:path}")
async def spa_catch_all(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Frontend not built"}

# Health check para Heroku
@app.get("/health")
def health_check():
    return {"status": "healthy"}
