from .routers import operaciones_router, router_plot, router_grapevines, router_vineyard ,router_inventory, router_users,router_tasklist,router_winery
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

def get_cors_origins():
    """Configura CORS para desarrollo y Heroku."""
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1",
        "https://odiseapp.herokuapp.com",  # Dominio principal de tu app
        "https://odiseapp-bf4d8516bab4.herokuapp.com"  # Dominio del frontend que causa el error
    ]
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
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/build")

# Solo montar archivos estáticos si el directorio existe (en producción)
if os.path.exists(frontend_path):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "static")), name="static")
    
    @app.get("/app/{full_path:path}")
    async def serve_react_app(full_path: str):
        """Servir aplicación React solo para rutas que empiecen con /app/"""
        index_file = os.path.join(frontend_path, "index.html")
        return FileResponse(index_file)

    @app.get("/")
    def read_root():
        return FileResponse(os.path.join(frontend_path, "index.html"))
else:
    # En desarrollo local, solo API
    @app.get("/")
    def read_root():
        return {"message": "ODISEApp API - Desarrollo"}

# Health check para Heroku
@app.get("/health")
def health_check():
    return {"status": "healthy"}