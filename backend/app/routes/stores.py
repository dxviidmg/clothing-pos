from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.models import Store, User, UserRole
from app.schemas.schemas import StoreCreate, StoreResponse, StoreUpdate

router = APIRouter(prefix="/api/stores", tags=["stores"])


@router.get("", response_model=list[StoreResponse])
def list_stores(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Store).filter(Store.tenant_id == current_user.tenant_id).all()
    )


@router.get("/{store_id}", response_model=StoreResponse)
def get_store(
    store_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    store = (
        db.query(Store)
        .filter(Store.id == store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    return store


@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
def create_store(
    data: StoreCreate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db),
):
    store = Store(tenant_id=current_user.tenant_id, **data.model_dump())
    db.add(store)
    db.commit()
    db.refresh(store)
    return store


@router.put("/{store_id}", response_model=StoreResponse)
def update_store(
    store_id: int,
    data: StoreUpdate,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db),
):
    store = (
        db.query(Store)
        .filter(Store.id == store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(store, key, value)

    db.commit()
    db.refresh(store)
    return store


@router.delete("/{store_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_store(
    store_id: int,
    current_user: User = Depends(require_role(UserRole.owner)),
    db: Session = Depends(get_db),
):
    store = (
        db.query(Store)
        .filter(Store.id == store_id, Store.tenant_id == current_user.tenant_id)
        .first()
    )
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Store not found")
    db.delete(store)
    db.commit()
