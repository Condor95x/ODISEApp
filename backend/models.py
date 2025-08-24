from geoalchemy2 import Geometry
from .database import Base
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Numeric, Text, Boolean, CheckConstraint,DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy import Computed

class Operacion(Base):
    __tablename__ = "operaciones"
    id = Column(Integer, primary_key=True, index=True)
    parcela_id = Column(Integer, ForeignKey("plot.plot_id"))
    tipo_operacion = Column(String, ForeignKey("task_list.task_name"))
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    estado = Column(String, nullable=True)
    responsable_id = Column(Integer, ForeignKey("usuarios.id"))
    nota = Column(Text, nullable=True)
    comentario = Column(Text, nullable=True)

    inputs = relationship("TaskInput", back_populates="operation")
    responsable = relationship("Usuario", back_populates="operaciones") # Relación con usuario
    plot = relationship("Plot", back_populates="operaciones")
    task = relationship("TaskList")
    
class TaskList(Base):
    __tablename__ = "task_list"

    task_list_id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String)
    task_supclass = Column(String, nullable=True)
    task_class = Column(String, nullable=True)
    task_name = Column(String, unique=True)

class Insumo(Base):
    __tablename__ = "insumos"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    unidad = Column(String)

    detalles_consumidos = relationship("DetalleInsumoConsumido", back_populates="insumo")

class DetalleInsumoConsumido(Base):
    __tablename__ = "detalles_insumos_consumidos"
    id = Column(Integer, primary_key=True, index=True)
    operacion_id = Column(Integer, ForeignKey("operaciones.id"))
    insumo_id = Column(Integer, ForeignKey("insumos.id"))
    cantidad = Column(Numeric)

    #operacion = relationship("Operacion", back_populates="insumos_consumidos")
    insumo = relationship("Insumo", back_populates="detalles_consumidos")

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    apellido = Column(String, nullable=True)
    email = Column(String, unique=True)
    password = Column(String)  # Recuerda encriptar la contraseña
    rol = Column(String)
    fecha_creacion = Column(Date)

    operaciones = relationship("Operacion", back_populates="responsable")

class Plot(Base):
    __tablename__ = "plot"
    
    # Columnas básicas
    plot_id = Column(Integer, primary_key=True, index=True)
    plot_name = Column(String, nullable=False, unique=True)
    plot_var = Column(String, ForeignKey("grapevines.gv_id"), nullable=False)
    plot_rootstock = Column(String, ForeignKey("grapevines.gv_id"), nullable=True)
    plot_implant_year = Column(Integer, nullable=True)
    plot_creation_year = Column(Integer, nullable=True)
    plot_conduction = Column(ForeignKey("vineyard.value"), nullable=True)
    plot_management = Column(ForeignKey("vineyard.value"), nullable=True)
    plot_description = Column(Text, nullable=True)
    
    # Estado
    active = Column(Boolean, default=True, nullable=False)
    
    # Geometría y área
    plot_geom = Column(Geometry("POLYGON", srid=4326), nullable=True)
    plot_area = Column(Numeric(10, 2), Computed("ST_Area(ST_Transform(plot_geom, 3857))", persisted=True))
    
    # Propiedades calculadas
    @hybrid_property
    def total_vines(self):
        if self.planting_density and self.plot_area:
            return int(self.planting_density * (self.plot_area / 10000))  # Convertir m² a hectáreas
        return None

    # Relaciones
    plot_var_relationship = relationship("Grapevine", foreign_keys=[plot_var], backref="plots_var")
    plot_rootstock_relationship = relationship("Grapevine", foreign_keys=[plot_rootstock], backref="plots_rootstock")
    operaciones = relationship("Operacion", back_populates="plot")
    #plot_management_relationship = relationship("Vineyard", foreign_keys=[plot_management], backref="plots_management")
    #plot_conduction_relationship = relationship("Vineyard", foreign_keys=[plot_conduction], backref="plots_conduction")

class Grapevine(Base):
    __tablename__ = "grapevines"
    
    gv_id = Column(String, primary_key=True)
    gv_use = Column(Text)
    name = Column(Text, nullable=False)
    synonyms = Column(Text)
    color = Column(Text)
    gv_type = Column(Text)
    maintenance_entity = Column(Text)
  
    # Relaciones
    parcelas_variedad = relationship("Plot", foreign_keys="[Plot.plot_var]", overlaps="plot_var_relationship,plots_var")
    parcelas_portainjerto = relationship("Plot", foreign_keys="[Plot.plot_rootstock]", overlaps="plot_rootstock_relationship,plots_rootstock")

class Vineyard(Base):
    __tablename__ = "vineyard"  

    vy_id = Column(String, primary_key=True)
    description = Column(String)
    value = Column(String, unique=True)

    #management_plot_relationship = relationship("plot", foreign_keys=[Plot.plot_management])
    #conduction_plot_relationship = relationship("plot", foreign_keys=[Plot.plot_conduction])

class InputCategory(Base):
    __tablename__ = 'input_categories'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String)

    inputs = relationship("Input", back_populates="category")

class Input(Base):
    __tablename__ = 'input'
    
    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey('input_categories.id'))
    name = Column(String(100), nullable=False)
    brand = Column(String(100))
    description = Column(String)
    unit_of_measure = Column(String(50), nullable=False)
    unit_price = Column(Numeric(12, 2))
    minimum_stock = Column(Numeric(12, 2))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    category = relationship("InputCategory", back_populates="inputs")
    stock = relationship("InputStock", back_populates="input")
    movements = relationship("InventoryMovement", back_populates="input")
    purchase_order_details = relationship("PurchaseOrderDetail", back_populates="input")
    task_inputs = relationship("TaskInput", back_populates="inputs")

class Warehouse(Base):
    __tablename__ = 'warehouse'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(200))
    description = Column(String)
    type = Column(String(50))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(type.in_(['vineyard', 'winery']), name='check_warehouse_type'),
    )

    stock = relationship("InputStock", back_populates="warehouse")
    movements = relationship("InventoryMovement", back_populates="warehouse")
    task_inputs = relationship("TaskInput", back_populates="warehouse")

class InputStock(Base):
    __tablename__ = 'input_stock'

    id = Column(Integer, primary_key=True, index=True)
    input_id = Column(Integer, ForeignKey('input.id', ondelete='CASCADE'))
    warehouse_id = Column(Integer, ForeignKey('warehouse.id'))
    available_quantity = Column(Numeric(12, 2), nullable=False)
    last_update = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(available_quantity >= 0, name='check_quantity_not_negative'),
    )

    input = relationship("Input", back_populates="stock")
    warehouse = relationship("Warehouse", back_populates="stock")

class InventoryMovement(Base):
    __tablename__ = 'inventory_movements'

    id = Column(Integer, primary_key=True, index=True)
    movement_date = Column(DateTime, default=func.now())
    input_id = Column(Integer, ForeignKey('input.id', ondelete='CASCADE'))
    warehouse_id = Column(Integer, ForeignKey('warehouse.id'))
    movement_type = Column(String(50))
    quantity = Column(Numeric(12, 2), nullable=False)
    unit_price = Column(Numeric(12, 2))
    
    # Hacer ambos campos opcionales y mutuamente excluyentes
    operation_id = Column(Integer, ForeignKey('operaciones.id'), nullable=True)
    vessel_activity_id = Column(Integer, ForeignKey('vessel_activities.id'), nullable=True)
    
    user_id = Column(Integer, ForeignKey('usuarios.id'))
    comments = Column(String)
    created_at = Column(DateTime, default=func.now())

    input = relationship("Input", back_populates="movements") 
    warehouse = relationship("Warehouse", back_populates="movements") 
    
    __table_args__ = (
        CheckConstraint(movement_type.in_(['entry', 'exit', 'adjustment']), name='check_movement_type'),
        # Asegurar que solo uno de los dos campos esté lleno
        CheckConstraint(
            '(operation_id IS NOT NULL AND vessel_activity_id IS NULL) OR '
            '(operation_id IS NULL AND vessel_activity_id IS NOT NULL)',
            name='check_single_reference'
        ),
    )

class Supplier(Base):
    __tablename__ = 'suppliers'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(50))
    email = Column(String(100))
    address = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")

class PurchaseOrder(Base):
    __tablename__ = 'purchase_orders'

    id = Column(Integer, primary_key=True, index=True)
    order_date = Column(DateTime, default=func.now())
    supplier_id = Column(Integer, ForeignKey('suppliers.id'))
    status = Column(String(50), default='pending')
    reception_date = Column(DateTime)
    user_id = Column(Integer, ForeignKey('usuarios.id')) # Reemplaza 'usuarios.id' si es necesario
    comments = Column(String)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(status.in_(['pending', 'partially_received', 'completed']), name='check_order_status'),
    )

    supplier = relationship("Supplier", back_populates="purchase_orders")
    details = relationship("PurchaseOrderDetail", back_populates="order")

class PurchaseOrderDetail(Base):
    __tablename__ = 'purchase_order_details'

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('purchase_orders.id'))
    input_id = Column(Integer, ForeignKey('input.id', ondelete='CASCADE'))
    requested_quantity = Column(Numeric(12, 2), nullable=False)
    received_quantity = Column(Numeric(12, 2), default=0)
    unit_price = Column(Numeric(12, 2))
    reception_date = Column(DateTime)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    order = relationship("PurchaseOrder", back_populates="details")
    input = relationship("Input", back_populates="purchase_order_details")

class TaskInput(Base):
    __tablename__ = 'task_inputs'

    id = Column(Integer, primary_key=True, index=True)
    operation_id = Column(Integer, ForeignKey('operaciones.id'),nullable=True) # Reemplaza 'operaciones.id' si es necesario
    input_id = Column(Integer, ForeignKey('input.id', ondelete='CASCADE'))
    planned_quantity = Column(Numeric(12, 2))
    used_quantity = Column(Numeric(12, 2),nullable=True)
    warehouse_id = Column(Integer, ForeignKey('warehouse.id'),nullable=True)
    status = Column(String(50), default='planned')
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(status.in_(['planned', 'used']), name='check_task_input_status'),
    )

    inputs = relationship("Input", back_populates="task_inputs")
    warehouse = relationship("Warehouse", back_populates="task_inputs")
    operation = relationship("Operacion", back_populates="inputs")

class Vessel(Base):
    __tablename__ = "vessels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String)
    capacity = Column(Numeric(10, 2))
    capacity_unit = Column(String(50))
    acquisition_date = Column(Date)
    status = Column(String(50))
    description = Column(Text)
    location = Column(String(255))

    batches = relationship("Batch", back_populates="vessel")
    origin_vessel_activities = relationship("VesselActivity", foreign_keys="[VesselActivity.origin_vessel_id]", back_populates="origin_vessel")
    destination_vessel_activities = relationship("VesselActivity", foreign_keys="[VesselActivity.destination_vessel_id]", back_populates="destination_vessel")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    entry_date = Column(Date)
    exit_date = Column(Date)
    variety = Column(String(255), ForeignKey("grapevines.gv_id"))
    plot_id = Column(Integer, ForeignKey("plot.plot_id"))
    description = Column(Text)
    vessel_id = Column(Integer, ForeignKey("vessels.id"))
    initial_volume = Column(Numeric(10, 2))
    current_volume = Column(Numeric(10, 2))

    vessel = relationship("Vessel", back_populates="batches")
    origin_batch_activities = relationship("VesselActivity", foreign_keys="[VesselActivity.origin_batch_id]", back_populates="origin_batch")
    destination_batch_activities = relationship("VesselActivity", foreign_keys="[VesselActivity.destination_batch_id]", back_populates="destination_batch")
    variety_relationship = relationship("Grapevine")
    plot = relationship("Plot")

class VesselActivity(Base):
    __tablename__ = "vessel_activities"

    id = Column(Integer, primary_key=True, index=True)
    origin_vessel_id = Column(Integer, ForeignKey("vessels.id"))
    destination_vessel_id = Column(Integer, ForeignKey("vessels.id"))
    task_id = Column(Integer, ForeignKey("task_list.task_list_id"))
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String(50))
    responsible_id = Column(Integer, ForeignKey("usuarios.id"))
    notes = Column(Text)
    comments = Column(Text)
    origin_batch_id = Column(Integer, ForeignKey("batches.id"))
    destination_batch_id = Column(Integer, ForeignKey("batches.id"))
    volume = Column(Numeric(10, 2))

    origin_vessel = relationship("Vessel", foreign_keys=[origin_vessel_id], back_populates="origin_vessel_activities")
    destination_vessel = relationship("Vessel", foreign_keys=[destination_vessel_id], back_populates="destination_vessel_activities")
    task = relationship("TaskList")
    responsible = relationship("Usuario")
    origin_batch = relationship("Batch", foreign_keys=[origin_batch_id], back_populates="origin_batch_activities")
    destination_batch = relationship("Batch", foreign_keys=[destination_batch_id], back_populates="destination_batch_activities")
