import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


# --- Enums ---


class StoreType(str, enum.Enum):
    store = "store"
    warehouse = "warehouse"


class UserRole(str, enum.Enum):
    owner = "owner"
    admin = "admin"
    cashier = "cashier"


class SaleStatus(str, enum.Enum):
    completed = "completed"
    cancelled = "cancelled"


class MovementType(str, enum.Enum):
    sale = "sale"
    cancellation = "cancellation"
    return_item = "return"
    adjustment = "adjustment"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"
    restock = "restock"


# --- Models ---


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    stores = relationship("Store", back_populates="tenant")
    users = relationship("User", back_populates="tenant")
    products = relationship("Product", back_populates="tenant")
    brands = relationship("Brand", back_populates="tenant")
    categories = relationship("Category", back_populates="tenant")
    sizes = relationship("Size", back_populates="tenant")
    sales = relationship("Sale", back_populates="tenant")
    inventory_movements = relationship("InventoryMovement", back_populates="tenant")


class Store(Base):
    __tablename__ = "stores"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    type = Column(Enum(StoreType), nullable=False, default=StoreType.store)
    address = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="stores")
    users = relationship("User", back_populates="store")
    variant_stocks = relationship("VariantStock", back_populates="store")
    sales = relationship("Sale", back_populates="store")
    inventory_movements = relationship("InventoryMovement", back_populates="store")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.cashier)
    is_active = Column(Boolean, default=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    store = relationship("Store", back_populates="users")
    sales = relationship("Sale", back_populates="user")
    inventory_movements = relationship("InventoryMovement", back_populates="user")


class Brand(Base):
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="brands")
    products = relationship("Product", back_populates="brand")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_brand_tenant_name"),
    )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="categories")
    products = relationship("Product", back_populates="category")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_category_tenant_name"),
    )


class Size(Base):
    __tablename__ = "sizes"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False)

    # Relationships
    tenant = relationship("Tenant", back_populates="sizes")
    variants = relationship("ProductVariant", back_populates="size")

    __table_args__ = (
        UniqueConstraint("tenant_id", "name", name="uq_size_tenant_name"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    barcode = Column(String(100), nullable=False, index=True)
    cost = Column(Numeric(10, 2), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    brand_id = Column(Integer, ForeignKey("brands.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="products")
    category = relationship("Category", back_populates="products")
    brand = relationship("Brand", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product")

    __table_args__ = (
        UniqueConstraint("tenant_id", "barcode", name="uq_product_tenant_barcode"),
    )


class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    size_id = Column(Integer, ForeignKey("sizes.id"), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="variants")
    size = relationship("Size", back_populates="variants")
    stocks = relationship("VariantStock", back_populates="variant")
    sale_items = relationship("SaleItem", back_populates="variant")
    inventory_movements = relationship("InventoryMovement", back_populates="variant")

    __table_args__ = (
        UniqueConstraint("product_id", "size_id", name="uq_variant_product_size"),
    )


class VariantStock(Base):
    __tablename__ = "variant_stocks"

    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(
        Integer, ForeignKey("product_variants.id"), nullable=False, index=True
    )
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False, index=True)
    stock = Column(Integer, nullable=False, default=0)

    # Relationships
    variant = relationship("ProductVariant", back_populates="stocks")
    store = relationship("Store", back_populates="variant_stocks")

    __table_args__ = (
        UniqueConstraint("variant_id", "store_id", name="uq_stock_variant_store"),
    )


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    status = Column(Enum(SaleStatus), nullable=False, default=SaleStatus.completed)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="sales")
    store = relationship("Store", back_populates="sales")
    user = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False, index=True)
    variant_id = Column(
        Integer, ForeignKey("product_variants.id"), nullable=False
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    unit_cost = Column(Numeric(10, 2), nullable=False)
    returned_qty = Column(Integer, nullable=False, default=0)

    # Relationships
    sale = relationship("Sale", back_populates="items")
    variant = relationship("ProductVariant", back_populates="sale_items")


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    variant_id = Column(
        Integer, ForeignKey("product_variants.id"), nullable=False, index=True
    )
    store_id = Column(Integer, ForeignKey("stores.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(Enum(MovementType), nullable=False)
    quantity = Column(Integer, nullable=False)
    reference_id = Column(Integer, nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="inventory_movements")
    variant = relationship("ProductVariant", back_populates="inventory_movements")
    store = relationship("Store", back_populates="inventory_movements")
    user = relationship("User", back_populates="inventory_movements")
