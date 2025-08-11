from fastapi import FastAPI
from contextlib import asynccontextmanager
from .routers import operaciones_router, router_plot, router_grapevines, router_vineyard ,router_inventory, router_users,router_tasklist,router_winery
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

origins = [
    "http://localhost:3000",  # Origen de tu frontend
    "http://127.0.0.1:3000", #  Origen de tu frontend (con 127.0.0.1)
    "http://127.0.0.1", #  Origen de tu frontend (sin puerto)
]
app.include_router(router_winery.router, prefix="/winery", tags=["winery"])
app.include_router(router_inventory.router, prefix="/inventory", tags=["inventory"])
app.include_router(router_tasklist.router, prefix="/task", tags=["task"])
app.include_router(router_users.router, prefix="/users", tags=["users"])
app.include_router(auth.router,prefix="/auth", tags=["auth"])
app.include_router(router_plot.router, prefix="/plots", tags=["plots"])
app.include_router(router_grapevines.router, prefix="/grapevines", tags=["grapevines"])
app.include_router(router_vineyard.router, prefix="/vineyard", tags=["vineyard"])
app.include_router(operaciones_router.router, prefix="/operaciones", tags=["operaciones"])


@app.get("/")
def read_root():
    return {"Hello": "World"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,  # Si necesitas enviar cookies o encabezados de autenticación
    allow_methods=["*"],  # Permite todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Permite todos los encabezados
)

# Ruta a la carpeta del build del frontend
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/build")

# Servir archivos estáticos
app.mount("/static", StaticFiles(directory=os.path.join(frontend_path, "static")), name="static")

# Ruta para servir index.html
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    index_file = os.path.join(frontend_path, "index.html")
    return FileResponse(index_file)
