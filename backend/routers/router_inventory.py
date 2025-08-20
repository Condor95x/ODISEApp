from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict
from datetime import datetime
from ..database import get_db
from ..crud.crud_inventory import (
    create_inventory_movement,
    get_input_stocks_with_details,
    get_input_stocks,
    get_input_stock_by_input_warehouse,
    get_input_stock,
    create_input_stock,
    delete_warehouse,
    update_warehouse,
    get_warehouses,
    get_warehouse,
    create_warehouse,
    delete_input,
    update_input,
    get_inputs,
    get_input,
    create_input as crud_create_input,  # ✅ Alias para evitar conflicto
    delete_input_category,
    update_input_category,
    get_input_categories,
    get_input_category
)
from ..schemas.schemas_inventory import (
    InventoryMovementCreate,
    InventoryMovement,
    InputStock,
    InputStockCreate,
    WarehouseUpdate,
    Warehouse,
    WarehouseCreate,
    InputUpdate,
    Input,
    InputCreate,
    InputCategoryUpdate,
    InputCategory,
    InputCategoryCreate
)

router = APIRouter(
    prefix="/inventory",
    tags=["inventory"]
)

# ==================== Input Categories Routes ====================

@router.get("/categories/{category_id}", response_model=Optional[InputCategory])
async def read_category(category_id: int, db: AsyncSession = Depends(get_db)):
    db_category = await get_input_category(db, category_id)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.get("/categories/", response_model=List[InputCategory])
async def read_categories(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    return await get_input_categories(db, skip, limit)

@router.put("/categories/{category_id}", response_model=Optional[InputCategory])
async def update_category(category_id: int, category: InputCategoryUpdate, db: AsyncSession = Depends(get_db)):
    db_category = await update_input_category(db, category_id, category)
    if db_category is None:
        raise HTTPException(status_code=404, detail="Category not found")
    return db_category

@router.delete("/categories/{category_id}", response_model=bool)
async def delete_category(category_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_input_category(db, category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return True

# ==================== Input Routes ====================

@router.post("/inputs/", response_model=Input)
async def create_input_endpoint(input_item: InputCreate, db: AsyncSession = Depends(get_db)):
    """
    Crear un nuevo input en el inventario.
    Si se especifica warehouse_id e initial_quantity > 0, también se creará el stock inicial.
    """
    print(f"Received input_item: {input_item.dict()}")
    try:
        # ✅ Ahora usa el alias correcto
        new_input = await crud_create_input(db, input_item)
        
        # Si se especifica un almacén y cantidad inicial, crear el stock
        if hasattr(input_item, 'warehouse_id') and hasattr(input_item, 'initial_quantity'):
            if input_item.warehouse_id and input_item.initial_quantity > 0:
                stock_data = InputStockCreate(
                    input_id=new_input.id,
                    warehouse_id=input_item.warehouse_id,
                    quantity=input_item.initial_quantity
                )
                await create_input_stock(db, stock_data)
        
        return new_input
        
    except ValueError as e:
        print(f"ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as generic_exception:
        print(f"Generic exception: {generic_exception}")
        print(f"Exception type: {type(generic_exception)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(generic_exception)}")

@router.get("/inputs/{input_id}", response_model=Optional[Input])
async def read_input(input_id: int, db: AsyncSession = Depends(get_db)):
    db_input = await get_input(db, input_id)
    if db_input is None:
        raise HTTPException(status_code=404, detail="Input not found")
    return db_input

@router.get("/inputs/", response_model=List[Input])
async def read_inputs(
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    return await get_inputs(db, skip, limit, category_id, is_active)

@router.put("/inputs/{input_id}", response_model=Optional[Input])
async def update_input_endpoint(input_id: int, input_item: InputUpdate, db: AsyncSession = Depends(get_db)):
    db_input = await update_input(db, input_id, input_item)
    if db_input is None:
        raise HTTPException(status_code=404, detail="Input not found")
    return db_input

@router.delete("/inputs/{input_id}", response_model=bool)
async def delete_input_endpoint(input_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_input(db, input_id):
        raise HTTPException(status_code=404, detail="Input not found")
    return True

# ==================== Warehouses Routes ====================

@router.post("/warehouses/", response_model=Warehouse)
async def create_warehouse_endpoint(warehouse: WarehouseCreate, db: AsyncSession = Depends(get_db)):
    return await create_warehouse(db, warehouse)

@router.get("/warehouses/{warehouse_id}", response_model=Optional[Warehouse])
async def read_warehouse(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    db_warehouse = await get_warehouse(db, warehouse_id)
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return db_warehouse

@router.get("/warehouses/", response_model=List[Warehouse])
async def read_warehouses(skip: int = 0, limit: int = 100, warehouse_type: Optional[str] = Query(None), db: AsyncSession = Depends(get_db)):
    return await get_warehouses(db, skip, limit, warehouse_type)

@router.put("/warehouses/{warehouse_id}", response_model=Optional[Warehouse])
async def update_warehouse_endpoint(warehouse_id: int, warehouse: WarehouseUpdate, db: AsyncSession = Depends(get_db)):
    db_warehouse = await update_warehouse(db, warehouse_id, warehouse)
    if db_warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return db_warehouse

@router.delete("/warehouses/{warehouse_id}", response_model=bool)
async def delete_warehouse_endpoint(warehouse_id: int, db: AsyncSession = Depends(get_db)):
    if not await delete_warehouse(db, warehouse_id):
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return True

# ==================== Input Stock Routes ====================

@router.post("/stocks/", response_model=InputStock)
async def create_stock(stock: InputStockCreate, db: AsyncSession = Depends(get_db)):
    return await create_input_stock(db, stock)

@router.get("/stocks/{stock_id}", response_model=Optional[InputStock])
async def read_stock(stock_id: int, db: AsyncSession = Depends(get_db)):
    db_stock = await get_input_stock(db, stock_id)
    if db_stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return db_stock

@router.get("/stocks/by_input_warehouse/", response_model=Optional[InputStock])
async def read_stock_by_input_warehouse(input_id: int, warehouse_id: int, db: AsyncSession = Depends(get_db)):
    db_stock = await get_input_stock_by_input_warehouse(db, input_id, warehouse_id)
    if db_stock is None:
        raise HTTPException(status_code=404, detail="Stock not found")
    return db_stock

@router.get("/stocks/", response_model=List[InputStock])
async def read_stocks(skip: int = 0, limit: int = 100, input_id: Optional[int] = Query(None), warehouse_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    return await get_input_stocks(db, skip, limit, input_id, warehouse_id)

@router.get("/stocks/details/", response_model=List[Dict])
async def read_stocks_with_details(skip: int = 0, limit: int = 100, input_id: Optional[int] = Query(None), warehouse_id: Optional[int] = Query(None), db: AsyncSession = Depends(get_db)):
    return await get_input_stocks_with_details(db, skip, limit, input_id, warehouse_id)

@router.post("/movements/", response_model=InventoryMovement)
async def create_inventory_movement_endpoint(
    movement: InventoryMovementCreate,
    db: AsyncSession = Depends(get_db)
):
    return await create_inventory_movement(db=db, movement=movement)