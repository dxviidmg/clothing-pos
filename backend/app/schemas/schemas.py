from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr

from app.models.models import MovementType, SaleStatus, StoreType, UserRole


# --- Tenant ---


class TenantCreate(BaseModel):
    name: str
    slug: str


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# --- Store ---


class StoreCreate(BaseModel):
    name: str
    type: StoreType = StoreType.store
    address: str | None = None


class StoreUpdate(BaseModel):
    name: str | None = None
    type: StoreType | None = None
    address: str | None = None
    is_active: bool | None = None


class StoreResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    type: StoreType
    address: str | None
    is_active: bool

    class Config:
        from_attributes = True


# --- User ---


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.cashier
    store_id: int | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    store_id: int | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: int
    tenant_id: int
    store_id: int | None
    email: str
    full_name: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True


# --- Auth ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    tenant_name: str
    tenant_slug: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Brand ---


class BrandCreate(BaseModel):
    name: str


class BrandResponse(BaseModel):
    id: int
    tenant_id: int
    name: str

    class Config:
        from_attributes = True


# --- Category ---


class CategoryCreate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    tenant_id: int
    name: str

    class Config:
        from_attributes = True


# --- Size ---


class SizeCreate(BaseModel):
    name: str


class SizeResponse(BaseModel):
    id: int
    tenant_id: int
    name: str

    class Config:
        from_attributes = True


# --- Product ---


class ProductCreate(BaseModel):
    name: str
    barcode: str
    cost: Decimal
    price: Decimal
    category_id: int
    brand_id: int


class ProductUpdate(BaseModel):
    name: str | None = None
    barcode: str | None = None
    cost: Decimal | None = None
    price: Decimal | None = None
    category_id: int | None = None
    brand_id: int | None = None


class ProductResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    barcode: str
    cost: Decimal
    price: Decimal
    category_id: int
    brand_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- ProductVariant ---


class ProductVariantCreate(BaseModel):
    size_id: int


class ProductVariantResponse(BaseModel):
    id: int
    product_id: int
    size_id: int

    class Config:
        from_attributes = True


class ProductWithVariantsResponse(ProductResponse):
    variants: list[ProductVariantResponse] = []


# --- VariantStock ---


class VariantStockCreate(BaseModel):
    variant_id: int
    store_id: int
    stock: int = 0


class VariantStockUpdate(BaseModel):
    stock: int


class VariantStockResponse(BaseModel):
    id: int
    variant_id: int
    store_id: int
    stock: int

    class Config:
        from_attributes = True


# --- Sale ---


class SaleItemCreate(BaseModel):
    variant_id: int
    quantity: int


class SaleCreate(BaseModel):
    store_id: int
    items: list[SaleItemCreate]


class SaleItemResponse(BaseModel):
    id: int
    sale_id: int
    variant_id: int
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal
    returned_qty: int

    class Config:
        from_attributes = True


class SaleResponse(BaseModel):
    id: int
    tenant_id: int
    store_id: int
    user_id: int
    total: Decimal
    status: SaleStatus
    created_at: datetime
    items: list[SaleItemResponse] = []

    class Config:
        from_attributes = True


class ReturnItemRequest(BaseModel):
    sale_item_id: int
    quantity: int


# --- InventoryMovement ---


class InventoryAdjustment(BaseModel):
    variant_id: int
    store_id: int
    quantity: int
    notes: str | None = None


class InventoryMovementResponse(BaseModel):
    id: int
    tenant_id: int
    variant_id: int
    store_id: int
    user_id: int
    type: MovementType
    quantity: int
    reference_id: int | None
    notes: str | None
    created_at: datetime

    class Config:
        from_attributes = True
