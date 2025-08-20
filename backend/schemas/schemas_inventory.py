from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import datetime
from decimal import Decimal

# Input Category Schemas
class InputCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class InputCategoryCreate(InputCategoryBase):
    pass

class InputCategoryUpdate(InputCategoryBase):
    name: Optional[str] = None

class InputCategory(InputCategoryBase):
    id: int
    
    class Config:
        orm_mode = True

# Input Schemas
class InputBase(BaseModel):
    name: str
    category_id: int
    brand: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: str
    unit_price: Optional[Decimal] = None
    minimum_stock: Optional[Decimal] = None
    is_active: bool = True

    class Config:
        orm_mode = True

class InputCreate(InputBase):
    name: str
    category_id: int
    brand: Optional[str] = ""
    description: Optional[str] = ""
    unit_of_measure: str
    unit_price: float  # Cambio de Decimal a float
    minimum_stock: int
    is_active: bool = True
    warehouse_id: Optional[int] = None
    initial_quantity: Optional[int] = 0

class InputUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    brand: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    unit_price: Optional[Decimal] = None
    minimum_stock: Optional[Decimal] = None
    is_active: Optional[bool] = None

class Input(InputBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Warehouse Schemas
class WarehouseBase(BaseModel):
    name: str
    location: Optional[str] = None
    description: Optional[str] = None
    type: str = Field(..., description="Must be 'vineyard' or 'winery'")
    
    @validator('type')
    def validate_type(cls, v):
        if v not in ["vineyard", "winery"]:
            raise ValueError('Type must be either "vineyard" or "winery"')
        return v

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    
    @validator('type')
    def validate_type(cls, v):
        if v is not None and v not in ["vineyard", "winery"]:
            raise ValueError('Type must be either "vineyard" or "winery"')
        return v

class Warehouse(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Input Stock Schemas
class InputStockBase(BaseModel):
    input_id: int
    warehouse_id: int
    available_quantity: Decimal = Field(..., ge=0)

class InputStockCreate(InputStockBase):
    pass

class InputStockUpdate(BaseModel):
    available_quantity: Decimal = Field(..., ge=0)

class InputStock(InputStockBase):
    id: int
    last_update: datetime
    
    class Config:
        orm_mode = True

class InputStockWithDetails(InputStock):
    input: Input
    warehouse: Warehouse
    
    class Config:
        orm_mode = True

# Inventory Movement Schemas
class InventoryMovementBase(BaseModel):
    input_id: int
    warehouse_id: int
    movement_type: str = Field(..., description="Must be 'entry', 'exit' or 'adjustment'")
    quantity: Decimal
    unit_price: Optional[Decimal] = None
    operation_id: Optional[int] = None
    user_id: Optional[int] = None
    comments: Optional[str] = None
    
    @validator('movement_type')
    def validate_movement_type(cls, v):
        if v not in ["entry", "exit", "adjustment"]:
            raise ValueError('Movement type must be "entry", "exit" or "adjustment"')
        return v

class InventoryMovementCreate(InventoryMovementBase):
    pass

class InventoryMovement(InventoryMovementBase):
    id: int
    movement_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

# Supplier Schemas
class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None

class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

# Purchase Order Schemas
class PurchaseOrderDetailBase(BaseModel):
    input_id: int
    requested_quantity: Decimal
    unit_price: Optional[Decimal] = None

class PurchaseOrderDetailCreate(PurchaseOrderDetailBase):
    pass

class PurchaseOrderDetailUpdate(BaseModel):
    requested_quantity: Optional[Decimal] = None
    received_quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    reception_date: Optional[datetime] = None

class PurchaseOrderDetail(PurchaseOrderDetailBase):
    id: int
    order_id: int
    received_quantity: Decimal = 0
    reception_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class PurchaseOrderBase(BaseModel):
    supplier_id: int
    user_id: int
    comments: Optional[str] = None
    status: str = "pending"
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ["pending", "partially_received", "completed"]:
            raise ValueError('Status must be "pending", "partially_received" or "completed"')
        return v

class PurchaseOrderCreate(PurchaseOrderBase):
    order_details: List[PurchaseOrderDetailCreate]

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    status: Optional[str] = None
    comments: Optional[str] = None
    reception_date: Optional[datetime] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in ["pending", "partially_received", "completed"]:
            raise ValueError('Status must be "pending", "partially_received" or "completed"')
        return v

class PurchaseOrderDetailWithInput(PurchaseOrderDetail):
    input: Input
    
    class Config:
        orm_mode = True

class PurchaseOrder(PurchaseOrderBase):
    id: int
    order_date: datetime
    reception_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class PurchaseOrderWithDetails(PurchaseOrder):
    order_details: List[PurchaseOrderDetailWithInput]
    supplier: Supplier
    
    class Config:
        orm_mode = True

# Task Input Schemas
class TaskInputBase(BaseModel):
    operation_id: Optional[int]
    input_id: Optional[int]
    warehouse_id: Optional[int]
    planned_quantity: Optional[Decimal] = None
    used_quantity: Optional[Decimal] = None
    status: str = "planned"
    
    @validator('status')
    def validate_status(cls, v):
        if v not in ["planned", "used"]:
            raise ValueError('Status must be "planned" or "used"')
        return v

class TaskInputCreate(TaskInputBase):
    pass

class TaskInputUpdate(BaseModel):
    planned_quantity: Optional[Decimal] = None
    used_quantity: Optional[Decimal] = None
    warehouse_id: Optional[int] = None
    status: Optional[str] = None
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None and v not in ["planned", "used"]:
            raise ValueError('Status must be "planned" or "used"')
        return v

class TaskInput(TaskInputBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True

class TaskInputWithDetails(TaskInput):
    input: Input
    warehouse: Warehouse
    
    class Config:
        orm_mode = True

class InventoryMovementCreate(BaseModel):
    movement_date: Optional[datetime] = None
    input_id: int
    warehouse_id: int
    movement_type: str
    quantity: float
    unit_price: Optional[float] = None
    operation_id: Optional[int] = None
    user_id: Optional[int] = None
    comments: Optional[str] = None

class InventoryMovement(BaseModel):
    id: int
    movement_date: Optional[datetime] = None
    input_id: int
    warehouse_id: int
    movement_type: str
    quantity: float
    unit_price: Optional[float] = None
    operation_id: Optional[int] = None
    user_id: Optional[int] = None
    comments: Optional[str] = None

    class Config:
        from_attributes = True