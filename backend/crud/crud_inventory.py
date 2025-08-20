import sqlalchemy.exc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, and_, func, or_
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from decimal import Decimal
from ..models import InputCategory, Warehouse, InputStock, InventoryMovement, Supplier, PurchaseOrder, PurchaseOrderDetail, TaskInput
from ..models import  Input as InputModel
from ..schemas.schemas_inventory import TaskInputUpdate,TaskInputCreate,PurchaseOrderDetailUpdate,PurchaseOrderUpdate,PurchaseOrderCreate,SupplierUpdate,SupplierCreate,InventoryMovementCreate,InputStockUpdate,InputStockCreate,WarehouseUpdate,WarehouseCreate,InputUpdate,InputCreate,InputCategoryUpdate 
from ..schemas.schemas_inventory import Input as InputSchema
from fastapi import HTTPException
# ==================== Input Categories CRUD ====================

async def create_input(db: AsyncSession, input_data: InputCreate):
    """
    Crear un nuevo input en la base de datos.
    """
    try:
        # Crear el objeto del modelo (NO el schema)
        db_input = InputModel(
            name=input_data.name,
            category_id=input_data.category_id,
            brand=input_data.brand or "",
            description=input_data.description or "",
            unit_of_measure=input_data.unit_of_measure,
            unit_price=float(input_data.unit_price),
            minimum_stock=input_data.minimum_stock,
            is_active=input_data.is_active
        )
        
        db.add(db_input)
        await db.commit()
        await db.refresh(db_input)
        
        # Crear stock inicial si se especifica
        if input_data.warehouse_id and input_data.initial_quantity > 0:
            from ..models import InputStock as InputStockModel
            
            db_stock = InputStockModel(
                input_id=db_input.id,
                warehouse_id=input_data.warehouse_id,
                quantity=input_data.initial_quantity
            )
            
            db.add(db_stock)
            await db.commit()
            await db.refresh(db_stock)
        
        return db_input
        
    except Exception as e:
        await db.rollback()
        print(f"Error creating input: {e}")
        raise ValueError(f"Error creating input: {str(e)}")

async def get_input_category(db: AsyncSession, category_id: int) -> Optional[InputCategory]:
    result = await db.execute(select(InputCategory).where(InputCategory.id == category_id))
    return result.scalars().first()

async def get_input_categories(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100
) -> List[InputCategory]:
    result = await db.execute(select(InputCategory).offset(skip).limit(limit))
    return result.scalars().all()

async def update_input_category(
    db: AsyncSession, 
    category_id: int, 
    category: InputCategoryUpdate
) -> Optional[InputCategory]:
    category_data = category.dict(exclude_unset=True)
    if not category_data:
        return await get_input_category(db, category_id)
    
    await db.execute(
        update(InputCategory)
        .where(InputCategory.id == category_id)
        .values(**category_data)
    )
    await db.commit()
    return await get_input_category(db, category_id)

async def delete_input_category(db: AsyncSession, category_id: int) -> bool:
    result = await db.execute(
        delete(InputCategory).where(InputCategory.id == category_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Input CRUD ====================

async def create_input(db: AsyncSession, input_item: InputCreate) -> InputModel:
    print(f"Creando input con: {input_item.dict()}")
    try:
        # Buscar la categoría por ID
        category = await db.execute(select(InputCategory).where(InputCategory.id == input_item.category_id))
        category = category.scalars().first()

        if not category:
            raise ValueError(f"Categoría con ID '{input_item.category_id}' no encontrada")

        print(f"Categoría encontrada: {category}")
        # Crear el input con el ID de la categoría
        db_input = InputSchema(
            name=input_item.name,
            category_id=category.id,
            brand=input_item.brand,
            description=input_item.description,
            unit_of_measure=input_item.unit_of_measure,
            unit_price=input_item.unit_price,
            minimum_stock=input_item.minimum_stock,
            is_active=input_item.is_active,
        )
        db.add(db_input)
        await db.flush()

        if input_item.warehouse_id:
            warehouse = await db.execute(select(Warehouse).where(Warehouse.id == input_item.warehouse_id))
            warehouse = warehouse.scalars().first()
            if warehouse:
                db_stock = InputStock(
                    input_id=db_input.id,
                    warehouse_id=warehouse.id,
                    available_quantity=input_item.initial_quantity,
                )
                db.add(db_stock)

        await db.commit()
        await db.refresh(db_input)
        print(f"Input creado: {db_input}")
        return db_input
    except Exception as e:
        print(f"Error en create_input: {e}") #Log del error
        raise # Re-lanzar el error para que sea capturado en la ruta

async def get_input(db: AsyncSession, input_id: int) -> Optional[InputModel]:
    result = await db.execute(select(InputModel).where(InputModel.id == input_id))
    return result.scalars().first()

async def get_inputs(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = None
) -> List[InputSchema]:
    query = select(InputModel)

    if category_id is not None:
        query = query.where(InputModel.category_id == category_id)

    if is_active is not None:
        query = query.where(InputModel.is_active == is_active)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    inputs = result.scalars().all()

    result_list = []
    for input_item in inputs:
        category = await db.execute(select(InputCategory).where(InputCategory.id == input_item.category_id))
        category = category.scalars().first()
        result_list.append(InputSchema(
            id=input_item.id,
            name=input_item.name,
            category_id=input_item.category_id, # Usar el category_id del input_item
            category_name=category.name if category else "Categoría no encontrada",
            brand=input_item.brand,
            description=input_item.description,
            unit_of_measure=input_item.unit_of_measure,
            unit_price=input_item.unit_price,
            minimum_stock=input_item.minimum_stock,
            is_active=input_item.is_active,
            created_at=input_item.created_at,
            updated_at=input_item.updated_at
        ))
    return result_list

async def update_input(
    db: AsyncSession, 
    input_id: int, 
    input_item: InputUpdate
) -> Optional[InputSchema]:
    input_data = input_item.dict(exclude_unset=True)
    if not input_data:
        return await get_input(db, input_id)
    
    input_data["updated_at"] = datetime.now()
    await db.execute(
        update(InputModel)
        .where(InputModel.id == input_id)
        .values(**input_data)
    )
    await db.commit()
    return await get_input(db, input_id)

async def delete_input(db: AsyncSession, input_id: int) -> bool:
    # Eliminar registros en input_stock
    await db.execute(delete(InputStock).where(InputStock.input_id == input_id))
    # Eliminar registros en inventory_movements
    await db.execute(delete(InventoryMovement).where(InventoryMovement.input_id == input_id))
    # Eliminar registros en purchase_order_details
    await db.execute(delete(PurchaseOrderDetail).where(PurchaseOrderDetail.input_id == input_id))
    # Eliminar registros en task_inputs
    await db.execute(delete(TaskInput).where(TaskInput.input_id == input_id)) # Asegúrate del nombre correcto de la columna

    result = await db.execute(
        delete(InputModel).where(InputModel.id == input_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Warehouses CRUD ====================

async def create_warehouse(db: AsyncSession, warehouse: WarehouseCreate) -> Warehouse:
    db_warehouse = Warehouse(**warehouse.dict())
    db.add(db_warehouse)
    await db.commit()
    await db.refresh(db_warehouse)
    return db_warehouse

async def get_warehouse(db: AsyncSession, warehouse_id: int) -> Optional[Warehouse]:
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    return result.scalars().first()

async def get_warehouses(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    warehouse_type: Optional[str] = None
) -> List[Warehouse]:
    query = select(Warehouse)
    
    if warehouse_type:
        query = query.where(Warehouse.type == warehouse_type)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_warehouse(
    db: AsyncSession, 
    warehouse_id: int, 
    warehouse: WarehouseUpdate
) -> Optional[Warehouse]:
    warehouse_data = warehouse.dict(exclude_unset=True)
    if not warehouse_data:
        return await get_warehouse(db, warehouse_id)
    
    warehouse_data["updated_at"] = datetime.now()
    await db.execute(
        update(Warehouse)
        .where(Warehouse.id == warehouse_id)
        .values(**warehouse_data)
    )
    await db.commit()
    return await get_warehouse(db, warehouse_id)

async def delete_warehouse(db: AsyncSession, warehouse_id: int) -> bool:
    result = await db.execute(
        delete(Warehouse).where(Warehouse.id == warehouse_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Input Stock CRUD ====================

async def create_input_stock(db: AsyncSession, stock: InputStockCreate) -> InputStock:
    db_stock = InputStock(**stock.dict())
    db.add(db_stock)
    await db.commit()
    await db.refresh(db_stock)
    return db_stock

async def get_input_stock(db: AsyncSession, stock_id: int) -> Optional[InputStock]:
    result = await db.execute(select(InputStock).where(InputStock.id == stock_id))
    return result.scalars().first()

async def get_input_stock_by_input_warehouse(
    db: AsyncSession, 
    input_id: int, 
    warehouse_id: int
) -> Optional[InputStock]:
    result = await db.execute(
        select(InputStock).where(
            and_(
                InputStock.input_id == input_id,
                InputStock.warehouse_id == warehouse_id
            )
        )
    )
    return result.scalars().first()

async def get_input_stocks(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    input_id: Optional[int] = None,
    warehouse_id: Optional[int] = None
) -> List[InputStock]:
    query = select(InputStock)
    
    if input_id is not None:
        query = query.where(InputStock.input_id == input_id)
    
    if warehouse_id is not None:
        query = query.where(InputStock.warehouse_id == warehouse_id)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_input_stocks_with_details(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    input_id: Optional[int] = None,
    warehouse_id: Optional[int] = None
    ) -> List[Dict]:
    print(f"DEBUG: get_input_stocks_with_details called with skip={skip}, limit={limit}, input_id={input_id}, warehouse_id={warehouse_id}")


    query = select(
        InputStock,
        InputModel,
        Warehouse
    ).join(
        InputModel, InputStock.input_id == InputModel.id
    ).join(
        Warehouse, InputStock.warehouse_id == Warehouse.id
    )

    if input_id is not None:
        query = query.where(InputStock.input_id == input_id)

    if warehouse_id is not None:
        query = query.where(InputStock.warehouse_id == warehouse_id)

    query = query.offset(skip).limit(limit)
    print(f"DEBUG: Executing query: {query}")
    result = await db.execute(query)
    print(f"DEBUG: Query result: {result}")
    
    stocks_with_details = []
    for stock, input_item, warehouse in result:
        stock_dict = {
            "id": stock.id,
            "input_id": stock.input_id,
            "warehouse_id": stock.warehouse_id,
            "available_quantity": float(stock.available_quantity),
            "last_update": stock.last_update,
            "input": {
                "id": input_item.id,
                "category_id": input_item.category_id,
                "name": input_item.name,
                "brand": input_item.brand,
                "description": input_item.description,
                "unit_of_measure": input_item.unit_of_measure,
                "unit_price": float(input_item.unit_price),
                "minimum_stock": float(input_item.minimum_stock),
                "is_active": input_item.is_active,
                "created_at": input_item.created_at,
                "updated_at": input_item.updated_at,
            },
            "warehouse": {
                "id": warehouse.id,
                "name": warehouse.name,
                "location": warehouse.location,
                "description": warehouse.description,
                "type": warehouse.type,
                "created_at": warehouse.created_at,
                "updated_at": warehouse.updated_at,
            },
        }
        stocks_with_details.append(stock_dict)
    print(f"DEBUG: stocks_with_details: {stocks_with_details}")
    return stocks_with_details

async def update_input_stock(
    db: AsyncSession, 
    stock_id: int, 
    stock: InputStockUpdate
) -> Optional[InputStock]:
    stock_data = stock.dict(exclude_unset=True)
    if not stock_data:
        return await get_input_stock(db, stock_id)
    
    stock_data["last_update"] = datetime.now()
    await db.execute(
        update(InputStock)
        .where(InputStock.id == stock_id)
        .values(**stock_data)
    )
    await db.commit()
    return await get_input_stock(db, stock_id)

async def delete_input_stock(db: AsyncSession, stock_id: int) -> bool:
    result = await db.execute(
        delete(InputStock).where(InputStock.id == stock_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Inventory Movements CRUD ====================

async def create_inventory_movement(
    db: AsyncSession, 
    movement: InventoryMovementCreate
) -> InventoryMovement:
    # Create the movement
    db_movement = InventoryMovement(**movement.dict())
    db.add(db_movement)
    await db.commit()
    await db.refresh(db_movement)
    
    # Update stock based on movement type
    stock = await get_input_stock_by_input_warehouse(
        db, movement.input_id, movement.warehouse_id
    )
    
    if stock:
        if movement.movement_type == "entry":
            stock.available_quantity += movement.quantity
        elif movement.movement_type == "exit":
            stock.available_quantity -= movement.quantity
        elif movement.movement_type == "adjustment":
            stock.available_quantity += movement.quantity  # Can be positive or negative for adjustment
        
        stock.last_update = datetime.now()
        await db.commit()
    else:
        # If stock doesn't exist and it's an entry, create new stock
        if movement.movement_type == "entry":
            new_stock = InputStock(
                input_id=movement.input_id,
                warehouse_id=movement.warehouse_id,
                available_quantity=movement.quantity
            )
            db.add(new_stock)
            await db.commit()
    
    return db_movement

async def get_inventory_movement(db: AsyncSession, movement_id: int) -> Optional[InventoryMovement]:
    result = await db.execute(select(InventoryMovement).where(InventoryMovement.id == movement_id))
    return result.scalars().first()

async def get_inventory_movements(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    input_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    movement_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    operation_id: Optional[int] = None
) -> List[InventoryMovement]:
    query = select(InventoryMovement)
    
    filters = []
    if input_id is not None:
        filters.append(InventoryMovement.input_id == input_id)
    
    if warehouse_id is not None:
        filters.append(InventoryMovement.warehouse_id == warehouse_id)
    
    if movement_type is not None:
        filters.append(InventoryMovement.movement_type == movement_type)
    
    if start_date is not None:
        filters.append(InventoryMovement.movement_date >= start_date)
    
    if end_date is not None:
        filters.append(InventoryMovement.movement_date <= end_date)
    
    if operation_id is not None:
        filters.append(InventoryMovement.operation_id == operation_id)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(InventoryMovement.movement_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

# ==================== Suppliers CRUD ====================

async def create_supplier(db: AsyncSession, supplier: SupplierCreate) -> Supplier:
    db_supplier = Supplier(**supplier.dict())
    db.add(db_supplier)
    await db.commit()
    await db.refresh(db_supplier)
    return db_supplier

async def get_supplier(db: AsyncSession, supplier_id: int) -> Optional[Supplier]:
    result = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    return result.scalars().first()

async def get_suppliers(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    is_active: Optional[bool] = None
) -> List[Supplier]:
    query = select(Supplier)
    
    if is_active is not None:
        query = query.where(Supplier.is_active == is_active)
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_supplier(
    db: AsyncSession, 
    supplier_id: int, 
    supplier: SupplierUpdate
) -> Optional[Supplier]:
    supplier_data = supplier.dict(exclude_unset=True)
    if not supplier_data:
        return await get_supplier(db, supplier_id)
    
    supplier_data["updated_at"] = datetime.now()
    await db.execute(
        update(Supplier)
        .where(Supplier.id == supplier_id)
        .values(**supplier_data)
    )
    await db.commit()
    return await get_supplier(db, supplier_id)

async def delete_supplier(db: AsyncSession, supplier_id: int) -> bool:
    result = await db.execute(
        delete(Supplier).where(Supplier.id == supplier_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Purchase Orders CRUD ====================

async def create_purchase_order(
    db: AsyncSession, 
    order: PurchaseOrderCreate
) -> PurchaseOrder:
    # Extract order details
    order_details = order.order_details
    order_data = order.dict(exclude={"order_details"})
    
    # Create purchase order
    db_order = PurchaseOrder(**order_data)
    db.add(db_order)
    await db.commit()
    await db.refresh(db_order)
    
    # Create order details
    for detail in order_details:
        db_detail = PurchaseOrderDetail(
            order_id=db_order.id,
            **detail.dict()
        )
        db.add(db_detail)
    
    await db.commit()
    await db.refresh(db_order)
    return db_order

async def get_purchase_order(db: AsyncSession, order_id: int) -> Optional[PurchaseOrder]:
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id))
    return result.scalars().first()

async def get_purchase_order_with_details(db: AsyncSession, order_id: int) -> Optional[Dict]:
    # Get the order
    order_result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == order_id))
    order = order_result.scalars().first()
    
    if not order:
        return None
    
    # Get supplier
    supplier_result = await db.execute(
        select(Supplier).where(Supplier.id == order.supplier_id)
    )
    supplier = supplier_result.scalars().first()
    
    # Get order details with input information
    details_result = await db.execute(
        select(PurchaseOrderDetail, InputModel)
        .join(InputModel, PurchaseOrderDetail.input_id == InputModel.id)
        .where(PurchaseOrderDetail.order_id == order_id)
    )
    
    details_with_inputs = []
    for detail, input_item in details_result:
        detail_dict = {**detail.__dict__}
        detail_dict["input"] = input_item
        details_with_inputs.append(detail_dict)
    
    order_with_details = {**order.__dict__}
    order_with_details["order_details"] = details_with_inputs
    order_with_details["supplier"] = supplier
    
    return order_with_details

async def get_purchase_orders(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    supplier_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[PurchaseOrder]:
    query = select(PurchaseOrder)
    
    filters = []
    if supplier_id is not None:
        filters.append(PurchaseOrder.supplier_id == supplier_id)
    
    if status is not None:
        filters.append(PurchaseOrder.status == status)
    
    if start_date is not None:
        filters.append(PurchaseOrder.order_date >= start_date)
    
    if end_date is not None:
        filters.append(PurchaseOrder.order_date <= end_date)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(PurchaseOrder.order_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def update_purchase_order(
    db: AsyncSession, 
    order_id: int, 
    order: PurchaseOrderUpdate
) -> Optional[PurchaseOrder]:
    order_data = order.dict(exclude_unset=True)
    if not order_data:
        return await get_purchase_order(db, order_id)
    
    order_data["updated_at"] = datetime.now()
    await db.execute(
        update(PurchaseOrder)
        .where(PurchaseOrder.id == order_id)
        .values(**order_data)
    )
    await db.commit()
    return await get_purchase_order(db, order_id)

async def update_purchase_order_detail(
    db: AsyncSession, 
    detail_id: int, 
    detail: PurchaseOrderDetailUpdate
) -> Optional[PurchaseOrderDetail]:
    detail_data = detail.dict(exclude_unset=True)
    if not detail_data:
        # Get the detail
        result = await db.execute(
            select(PurchaseOrderDetail).where(PurchaseOrderDetail.id == detail_id)
        )
        return result.scalars().first()
    
    detail_data["updated_at"] = datetime.now()
    await db.execute(
        update(PurchaseOrderDetail)
        .where(PurchaseOrderDetail.id == detail_id)
        .values(**detail_data)
    )
    await db.commit()
    
    # Get the detail
    result = await db.execute(
        select(PurchaseOrderDetail).where(PurchaseOrderDetail.id == detail_id)
    )
    detail = result.scalars().first()
    
    # Update order status
    if detail:
        # Get order details
        order_details_result = await db.execute(
            select(PurchaseOrderDetail).where(PurchaseOrderDetail.order_id == detail.order_id)
        )
        order_details = order_details_result.scalars().all()
        
        # Check if all items are received
        all_received = all(d.received_quantity >= d.requested_quantity for d in order_details)
        any_received = any(d.received_quantity > 0 for d in order_details)
        
        # Update order status
        new_status = "completed" if all_received else "partially_received" if any_received else "pending"
        
        await db.execute(
            update(PurchaseOrder)
            .where(PurchaseOrder.id == detail.order_id)
            .values(status=new_status, updated_at=datetime.now())
        )
        
        # If receiving items, create inventory movement
        if "received_quantity" in detail_data and detail_data["received_quantity"] > 0:
            # Calculate the quantity being received now (delta)
            previous_result = await db.execute(
                select(PurchaseOrderDetail).where(PurchaseOrderDetail.id == detail_id)
            )
            previous_detail = previous_result.scalars().first()
            received_delta = Decimal(detail_data["received_quantity"]) - previous_detail.received_quantity
            
            if received_delta > 0:
                # Get input and warehouse for this order
                order_result = await db.execute(
                    select(PurchaseOrder).where(PurchaseOrder.id == detail.order_id)
                )
                order = order_result.scalars().first()
                
                # Get the default warehouse (first warehouse of type 'winery')
                warehouse_result = await db.execute(
                    select(Warehouse).where(Warehouse.type == "winery").limit(1)
                )
                warehouse = warehouse_result.scalars().first()
                
                if warehouse:
                    # Create inventory movement
                    movement = InventoryMovement(
                        input_id=detail.input_id,
                        warehouse_id=warehouse.id,
                        movement_type="entry",
                        quantity=received_delta,
                        unit_price=detail.unit_price,
                        user_id=order.user_id,
                        comments=f"Recepción de orden de compra #{order.id}"
                    )
                    db.add(movement)
                    
                    # Update stock
                    stock = await get_input_stock_by_input_warehouse(
                        db, detail.input_id, warehouse.id
                    )
                    
                    if stock:
                        stock.available_quantity += received_delta
                        stock.last_update = datetime.now()
                    else:
                        # Create new stock entry
                        new_stock = InputStock(
                            input_id=detail.input_id,
                            warehouse_id=warehouse.id,
                            available_quantity=received_delta
                        )
                        db.add(new_stock)
        
        await db.commit()
    
    # Get the updated detail
    result = await db.execute(
        select(PurchaseOrderDetail).where(PurchaseOrderDetail.id == detail_id)
    )
    return result.scalars().first()

async def delete_purchase_order(db: AsyncSession, order_id: int) -> bool:
    # First delete all order details
    await db.execute(
        delete(PurchaseOrderDetail).where(PurchaseOrderDetail.order_id == order_id)
    )
    
    # Then delete the order
    result = await db.execute(
        delete(PurchaseOrder).where(PurchaseOrder.id == order_id)
    )
    await db.commit()
    return result.rowcount > 0

# ==================== Task Input CRUD ====================

async def create_task_input(db: AsyncSession, task_input: TaskInputCreate) -> TaskInput:
    db_task_input = TaskInput(**task_input.dict())
    db.add(db_task_input)
    await db.commit()
    await db.refresh(db_task_input)
    return db_task_input

async def get_task_input(db: AsyncSession, task_input_id: int) -> Optional[TaskInput]:
    result = await db.execute(select(TaskInput).where(TaskInput.id == task_input_id))
    return result.scalars().first()

async def get_task_inputs(
    db: AsyncSession, 
    skip: int = 0, 
    limit: int = 100,
    operation_id: Optional[int] = None,
    input_id: Optional[int] = None,
    warehouse_id: Optional[int] = None,
    status: Optional[str] = None
) -> List[TaskInput]:
    query = select(TaskInput)
    
    filters = []
    if operation_id is not None:
        filters.append(TaskInput.operation_id == operation_id)
    
    if input_id is not None:
        filters.append(TaskInput.input_id == input_id)
    
    if warehouse_id is not None:
        filters.append(TaskInput.warehouse_id == warehouse_id)
    
    if status is not None:
        filters.append(TaskInput.status == status)
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

async def get_task_inputs_with_details(
    db: AsyncSession, 
    operation_id: int
) -> List[Dict]:
    query = select(
        TaskInput,
        InputModel,
        Warehouse
    ).join(
        InputModel, TaskInput.input_id == InputModel.id
    ).join(
        Warehouse, TaskInput.warehouse_id == Warehouse.id
    ).where(
        TaskInput.operation_id == operation_id
    )
    
    result = await db.execute(query)
    
    task_inputs_with_details = []
    for task_input, input_item, warehouse in result:
        task_input_dict = {**task_input.__dict__}
        task_input_dict["input"] = input_item
        task_input_dict["warehouse"] = warehouse
        task_inputs_with_details.append(task_input_dict)
    
    return task_inputs_with_details

async def update_task_input(
    db: AsyncSession, 
    task_input_id: int, 
    task_input: TaskInputUpdate
) -> Optional[TaskInput]:
    task_input_data = task_input.dict(exclude_unset=True)
    if not task_input_data:
        return await get_task_input(db, task_input_id)
    
    # Get the current task input
    current_task_input = await get_task_input(db, task_input_id)
    if not current_task_input:
        return None
    
    task_input_data["updated_at"] = datetime.now()
    await db.execute(
        update(TaskInput)
        .where(TaskInput.id == task_input_id)
        .values(**task_input_data)
    )
    await db.commit()
    
    # Handle inventory movement if status changes to "used"
    if (task_input.status == "used" and current_task_input.status != "used") and task_input.used_quantity:
        # Create inventory movement
        movement = InventoryMovement(
            input_id=current_task_input.input_id,
            warehouse_id=current_task_input.warehouse_id if task_input.warehouse_id is None else task_input.warehouse_id,
            movement_type="exit",
            quantity=task_input.used_quantity,
            operation_id=current_task_input.operation_id,
            comments=f"Insumos usados en operación #{current_task_input.operation_id}"
        )
        db.add(movement)
        
        # Update stock
        warehouse_id = current_task_input.warehouse_id if task_input.warehouse_id is None else task_input.warehouse_id
        stock = await get_input_stock_by_input_warehouse(
            db, current_task_input.input_id, warehouse_id
        )
        
        if stock:
            stock.available_quantity -= task_input.used_quantity
            stock.last_update = datetime.now()
            await db.commit()
    
    return await get_task_input(db, task_input_id)

async def delete_task_input(db: AsyncSession, task_input_id: int) -> bool:
    result = await db.execute(
        delete(TaskInput).where(TaskInput.id == task_input_id)
    )
    await db.commit()
    return result.rowcount > 0

async def create_inventory_movement(
    db: AsyncSession,
    movement: InventoryMovementCreate
):
    try:
        print(f"DEBUG: Movement data: {movement.dict()}")
        db_movement = InventoryMovement(**movement.dict())
        db.add(db_movement)

        # Actualizar el stock disponible
        stock = await db.execute(
            select(InputStock).filter(
                InputStock.input_id == movement.input_id,
                InputStock.warehouse_id == movement.warehouse_id
            )
        )
        stock = stock.scalar_one_or_none()
        print(f"DEBUG: Stock found: {stock}") #Log de debug

        if stock:
            print(f"DEBUG: Stock available quantity before: {stock.available_quantity}")
            print(f"DEBUG: Movement quantity: {movement.quantity}")
            if movement.movement_type == 'entry':
                stock.available_quantity += Decimal(str(movement.quantity))
                print(f"DEBUG: Stock available quantity after entry: {stock.available_quantity}")
            elif movement.movement_type == 'exit':
                if stock.available_quantity < Decimal(str(movement.quantity)):
                    raise HTTPException(status_code=400, detail="Cantidad insuficiente en stock")
                stock.available_quantity -= Decimal(str(movement.quantity))
                print(f"DEBUG: Stock available quantity after exit: {stock.available_quantity}")
            else:
                raise HTTPException(status_code=400, detail="Tipo de movimiento no valido")
        else:
            if movement.movement_type == "exit":
                raise HTTPException(status_code=400, detail="No existe stock para el producto y almacen indicados")
            new_stock = InputStock(
                input_id=movement.input_id,
                warehouse_id=movement.warehouse_id,
                available_quantity= Decimal(str(movement.quantity)) #Convertimos a decimal.Decimal
            )
            db.add(new_stock)
            print(f"DEBUG: New Stock Created: {new_stock}")

        await db.commit()
        await db.refresh(db_movement)
        return db_movement
    except HTTPException as http_exc:
        await db.rollback()
        print(f"DEBUG: HTTPException: {str(http_exc)}")
        raise http_exc
    except sqlalchemy.exc.SQLAlchemyError as sql_exc:
        await db.rollback()
        print(f"DEBUG: SQLAlchemyError: {str(sql_exc)}") #Log con el error especifico
        raise HTTPException(status_code=500, detail=f"Error de base de datos: {str(sql_exc)}")
    except Exception as e:
        await db.rollback()
        print(f"DEBUG: Exception: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")
    