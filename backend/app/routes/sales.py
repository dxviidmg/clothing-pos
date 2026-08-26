from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import (
    InventoryMovement,
    MovementType,
    Product,
    ProductVariant,
    Sale,
    SaleItem,
    SaleStatus,
    Store,
    User,
    UserRole,
    VariantStock,
)
from app.schemas.schemas import ReturnItemRequest, SaleCreate, SaleResponse

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("", response_model=list[SaleResponse])
def list_sales(
    store_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.tenant_id == current_user.tenant_id)
    )
    if store_id:
        query = query.filter(Sale.store_id == store_id)

    # Non-owners can only see sales from their store
    if current_user.role != UserRole.owner and current_user.store_id:
        query = query.filter(Sale.store_id == current_user.store_id)

    return query.order_by(Sale.created_at.desc()).all()


@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.id == sale_id, Sale.tenant_id == current_user.tenant_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    return sale


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def create_sale(
    data: SaleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new sale. All users can sell."""
    # Verify store belongs to tenant
    store = (
        db.query(Store)
        .filter(Store.id == data.store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    # Non-owners must sell from their assigned store
    if current_user.role != UserRole.owner and current_user.store_id:
        if current_user.store_id != data.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only sell from your assigned store",
            )

    if not data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale must have at least one item",
        )

    total = 0
    sale_items = []

    for item in data.items:
        # Get variant and product info
        variant = (
            db.query(ProductVariant)
            .options(joinedload(ProductVariant.product))
            .filter(ProductVariant.id == item.variant_id)
            .first()
        )
        if not variant or variant.product.tenant_id != current_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Variant {item.variant_id} not found",
            )

        # Check stock
        stock = (
            db.query(VariantStock)
            .filter(
                VariantStock.variant_id == item.variant_id,
                VariantStock.store_id == data.store_id,
            )
            .first()
        )
        if not stock or stock.stock < item.quantity:
            available = stock.stock if stock else 0
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for variant {item.variant_id}. Available: {available}, requested: {item.quantity}",
            )

        # Deduct stock
        stock.stock -= item.quantity

        # Calculate line total
        unit_price = float(variant.product.price)
        unit_cost = float(variant.product.cost)
        line_total = unit_price * item.quantity
        total += line_total

        sale_items.append(
            SaleItem(
                variant_id=item.variant_id,
                quantity=item.quantity,
                unit_price=unit_price,
                unit_cost=unit_cost,
            )
        )

    # Create sale
    sale = Sale(
        tenant_id=current_user.tenant_id,
        store_id=data.store_id,
        user_id=current_user.id,
        total=total,
        status=SaleStatus.completed,
    )
    db.add(sale)
    db.flush()

    # Add items and create movements
    for sale_item in sale_items:
        sale_item.sale_id = sale.id
        db.add(sale_item)

        movement = InventoryMovement(
            tenant_id=current_user.tenant_id,
            variant_id=sale_item.variant_id,
            store_id=data.store_id,
            user_id=current_user.id,
            type=MovementType.sale,
            quantity=-sale_item.quantity,
            reference_id=sale.id,
        )
        db.add(movement)

    db.commit()
    db.refresh(sale)
    return sale


@router.post("/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(
    sale_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Cancel a sale completely. Restores all stock."""
    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.id == sale_id, Sale.tenant_id == current_user.tenant_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    if sale.status == SaleStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Sale is already cancelled"
        )

    sale.status = SaleStatus.cancelled

    # Restore stock for all items
    for item in sale.items:
        effective_qty = item.quantity - item.returned_qty
        if effective_qty > 0:
            stock = (
                db.query(VariantStock)
                .filter(
                    VariantStock.variant_id == item.variant_id,
                    VariantStock.store_id == sale.store_id,
                )
                .first()
            )
            if stock:
                stock.stock += effective_qty

            movement = InventoryMovement(
                tenant_id=current_user.tenant_id,
                variant_id=item.variant_id,
                store_id=sale.store_id,
                user_id=current_user.id,
                type=MovementType.cancellation,
                quantity=effective_qty,
                reference_id=sale.id,
            )
            db.add(movement)

    db.commit()
    db.refresh(sale)
    return sale


@router.post("/{sale_id}/return", response_model=SaleResponse)
def return_items(
    sale_id: int,
    data: ReturnItemRequest,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    """Return items from a sale. Partial returns supported."""
    sale = (
        db.query(Sale)
        .options(joinedload(Sale.items))
        .filter(Sale.id == sale_id, Sale.tenant_id == current_user.tenant_id)
        .first()
    )
    if not sale:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
    if sale.status == SaleStatus.cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot return items from a cancelled sale",
        )

    # Find the sale item
    sale_item = (
        db.query(SaleItem)
        .filter(SaleItem.id == data.sale_item_id, SaleItem.sale_id == sale_id)
        .first()
    )
    if not sale_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Sale item not found"
        )

    # Validate return quantity
    max_returnable = sale_item.quantity - sale_item.returned_qty
    if data.quantity > max_returnable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot return {data.quantity}. Max returnable: {max_returnable}",
        )

    # Update returned quantity
    sale_item.returned_qty += data.quantity

    # Restore stock
    stock = (
        db.query(VariantStock)
        .filter(
            VariantStock.variant_id == sale_item.variant_id,
            VariantStock.store_id == sale.store_id,
        )
        .first()
    )
    if stock:
        stock.stock += data.quantity

    # Log movement
    movement = InventoryMovement(
        tenant_id=current_user.tenant_id,
        variant_id=sale_item.variant_id,
        store_id=sale.store_id,
        user_id=current_user.id,
        type=MovementType.return_item,
        quantity=data.quantity,
        reference_id=sale.id,
    )
    db.add(movement)

    # Recalculate total
    new_total = sum(
        float(item.unit_price) * (item.quantity - item.returned_qty)
        for item in sale.items
    )
    sale.total = new_total

    db.commit()
    db.refresh(sale)
    return sale
