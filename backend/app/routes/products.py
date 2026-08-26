from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import Product, ProductVariant, User, UserRole
from app.schemas.schemas import (
    ProductCreate,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
    ProductWithVariantsResponse,
)

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=list[ProductWithVariantsResponse])
def list_products(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.tenant_id == current_user.tenant_id)
        .all()
    )


@router.get("/{product_id}", response_model=ProductWithVariantsResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.id == product_id, Product.tenant_id == current_user.tenant_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.get("/barcode/{barcode}", response_model=ProductWithVariantsResponse)
def get_product_by_barcode(
    barcode: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .options(joinedload(Product.variants))
        .filter(Product.barcode == barcode, Product.tenant_id == current_user.tenant_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.post("", response_model=ProductWithVariantsResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    # Check barcode uniqueness within tenant
    existing = (
        db.query(Product)
        .filter(Product.tenant_id == current_user.tenant_id, Product.barcode == data.barcode)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A product with this barcode already exists",
        )

    product = Product(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductWithVariantsResponse)
def update_product(
    product_id: int,
    data: ProductUpdate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.tenant_id == current_user.tenant_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)

    # Check barcode uniqueness if changing
    if "barcode" in update_data:
        existing = (
            db.query(Product)
            .filter(
                Product.tenant_id == current_user.tenant_id,
                Product.barcode == update_data["barcode"],
                Product.id != product_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A product with this barcode already exists",
            )

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.tenant_id == current_user.tenant_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(product)
    db.commit()


# --- Variants ---


@router.post("/{product_id}/variants", response_model=ProductVariantResponse, status_code=status.HTTP_201_CREATED)
def add_variant(
    product_id: int,
    data: ProductVariantCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.tenant_id == current_user.tenant_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Check if variant already exists
    existing = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == product_id, ProductVariant.size_id == data.size_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Variant with this size already exists for this product",
        )

    variant = ProductVariant(product_id=product_id, size_id=data.size_id)
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


@router.delete("/{product_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variant(
    product_id: int,
    variant_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.id == variant_id, ProductVariant.product_id == product_id)
        .first()
    )
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    db.delete(variant)
    db.commit()
