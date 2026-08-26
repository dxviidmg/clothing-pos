from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import (
    InventoryMovement,
    MovementType,
    ProductVariant,
    Store,
    User,
    UserRole,
    VariantStock,
)
from app.schemas.schemas import (
    InventoryAdjustment,
    InventoryMovementResponse,
    VariantStockCreate,
    VariantStockResponse,
    VariantStockUpdate,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


# --- Stock ---


@router.get("/stock", response_model=list[VariantStockResponse])
def list_stock(
    store_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List stock. Optionally filter by store_id."""
    query = (
        db.query(VariantStock)
        .join(Store)
        .filter(Store.tenant_id == current_user.tenant_id)
    )
    if store_id:
        query = query.filter(VariantStock.store_id == store_id)
    return query.all()


@router.get("/stock/variant/{variant_id}", response_model=list[VariantStockResponse])
def get_variant_stock(
    variant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get stock for a specific variant across all stores."""
    return (
        db.query(VariantStock)
        .join(Store)
        .filter(
            VariantStock.variant_id == variant_id,
            Store.tenant_id == current_user.tenant_id,
        )
        .all()
    )


@router.post("/stock", response_model=VariantStockResponse, status_code=status.HTTP_201_CREATED)
def set_stock(
    data: VariantStockCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Initialize stock for a variant in a store."""
    # Verify store belongs to tenant
    store = (
        db.query(Store)
        .filter(Store.id == data.store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    # Verify variant belongs to tenant
    variant = (
        db.query(ProductVariant)
        .join(ProductVariant.product)
        .filter(
            ProductVariant.id == data.variant_id,
        )
        .first()
    )
    if not variant or variant.product.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")

    # Check if already exists
    existing = (
        db.query(VariantStock)
        .filter(
            VariantStock.variant_id == data.variant_id,
            VariantStock.store_id == data.store_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock record already exists. Use adjustment to modify.",
        )

    stock = VariantStock(
        variant_id=data.variant_id, store_id=data.store_id, stock=data.stock
    )
    db.add(stock)

    # Log the movement if initial stock > 0
    if data.stock > 0:
        movement = InventoryMovement(
            tenant_id=current_user.tenant_id,
            variant_id=data.variant_id,
            store_id=data.store_id,
            user_id=current_user.id,
            type=MovementType.restock,
            quantity=data.stock,
            notes="Initial stock",
        )
        db.add(movement)

    db.commit()
    db.refresh(stock)
    return stock


# --- Adjustments ---


@router.post("/adjust", response_model=InventoryMovementResponse)
def adjust_stock(
    data: InventoryAdjustment,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Adjust stock (restock, shrinkage, manual correction). Quantity can be positive or negative."""
    # Verify store belongs to tenant
    store = (
        db.query(Store)
        .filter(Store.id == data.store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    # Get or create stock record
    stock = (
        db.query(VariantStock)
        .filter(
            VariantStock.variant_id == data.variant_id,
            VariantStock.store_id == data.store_id,
        )
        .first()
    )
    if not stock:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stock record not found. Initialize stock first.",
        )

    # Check resulting stock won't go negative
    new_stock = stock.stock + data.quantity
    if new_stock < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Current: {stock.stock}, adjustment: {data.quantity}",
        )

    stock.stock = new_stock

    # Determine movement type
    if data.quantity > 0:
        movement_type = MovementType.restock
    else:
        movement_type = MovementType.adjustment

    movement = InventoryMovement(
        tenant_id=current_user.tenant_id,
        variant_id=data.variant_id,
        store_id=data.store_id,
        user_id=current_user.id,
        type=movement_type,
        quantity=data.quantity,
        notes=data.notes,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


# --- Movement history ---


@router.get("/movements", response_model=list[InventoryMovementResponse])
def list_movements(
    store_id: int | None = None,
    variant_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List inventory movements. Filter by store and/or variant."""
    query = db.query(InventoryMovement).filter(
        InventoryMovement.tenant_id == current_user.tenant_id
    )
    if store_id:
        query = query.filter(InventoryMovement.store_id == store_id)
    if variant_id:
        query = query.filter(InventoryMovement.variant_id == variant_id)
    return query.order_by(InventoryMovement.created_at.desc()).all()
