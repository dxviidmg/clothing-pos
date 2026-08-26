from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import Brand, Category, Size, User, UserRole
from app.schemas.schemas import (
    BrandCreate,
    BrandResponse,
    CategoryCreate,
    CategoryResponse,
    SizeCreate,
    SizeResponse,
)

router = APIRouter(prefix="/api/catalog", tags=["catalog"])


# --- Brands ---


@router.get("/brands", response_model=list[BrandResponse])
def list_brands(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Brand).filter(Brand.tenant_id == current_user.tenant_id).all()


@router.post("/brands", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create_brand(
    data: BrandCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Brand)
        .filter(Brand.tenant_id == current_user.tenant_id, Brand.name == data.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand already exists",
        )
    brand = Brand(tenant_id=current_user.tenant_id, name=data.name)
    db.add(brand)
    db.commit()
    db.refresh(brand)
    return brand


@router.delete("/brands/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_brand(
    brand_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    brand = (
        db.query(Brand)
        .filter(Brand.id == brand_id, Brand.tenant_id == current_user.tenant_id)
        .first()
    )
    if not brand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
    db.delete(brand)
    db.commit()


# --- Categories ---


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Category).filter(Category.tenant_id == current_user.tenant_id).all()


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Category)
        .filter(Category.tenant_id == current_user.tenant_id, Category.name == data.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category already exists",
        )
    category = Category(tenant_id=current_user.tenant_id, name=data.name)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.tenant_id == current_user.tenant_id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    db.delete(category)
    db.commit()


# --- Sizes ---


@router.get("/sizes", response_model=list[SizeResponse])
def list_sizes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Size).filter(Size.tenant_id == current_user.tenant_id).all()


@router.post("/sizes", response_model=SizeResponse, status_code=status.HTTP_201_CREATED)
def create_size(
    data: SizeCreate,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(Size)
        .filter(Size.tenant_id == current_user.tenant_id, Size.name == data.name)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Size already exists",
        )
    size = Size(tenant_id=current_user.tenant_id, name=data.name)
    db.add(size)
    db.commit()
    db.refresh(size)
    return size


@router.delete("/sizes/{size_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_size(
    size_id: int,
    current_user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
    db: Session = Depends(get_db),
):
    size = (
        db.query(Size)
        .filter(Size.id == size_id, Size.tenant_id == current_user.tenant_id)
        .first()
    )
    if not size:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Size not found")
    db.delete(size)
    db.commit()
