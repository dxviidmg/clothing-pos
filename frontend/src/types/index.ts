// --- Enums ---

export enum StoreType {
  STORE = "store",
  WAREHOUSE = "warehouse",
}

export enum UserRole {
  OWNER = "owner",
  ADMIN = "admin",
  CASHIER = "cashier",
}

export enum SaleStatus {
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum MovementType {
  SALE = "sale",
  CANCELLATION = "cancellation",
  RETURN = "return",
  ADJUSTMENT = "adjustment",
  TRANSFER_IN = "transfer_in",
  TRANSFER_OUT = "transfer_out",
  RESTOCK = "restock",
}

// --- Models ---

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
}

export interface Store {
  id: number;
  tenant_id: number;
  name: string;
  type: StoreType;
  address: string | null;
  is_active: boolean;
}

export interface User {
  id: number;
  tenant_id: number;
  store_id: number | null;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface Brand {
  id: number;
  tenant_id: number;
  name: string;
}

export interface Category {
  id: number;
  tenant_id: number;
  name: string;
}

export interface Size {
  id: number;
  tenant_id: number;
  name: string;
}

export interface Product {
  id: number;
  tenant_id: number;
  name: string;
  barcode: string;
  cost: number;
  price: number;
  category_id: number;
  brand_id: number;
  created_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  size_id: number;
}

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export interface VariantStock {
  id: number;
  variant_id: number;
  store_id: number;
  stock: number;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  variant_id: number;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  returned_qty: number;
}

export interface Sale {
  id: number;
  tenant_id: number;
  store_id: number;
  user_id: number;
  total: number;
  status: SaleStatus;
  created_at: string;
  items: SaleItem[];
}

export interface InventoryMovement {
  id: number;
  tenant_id: number;
  variant_id: number;
  store_id: number;
  user_id: number;
  type: MovementType;
  quantity: number;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
}

// --- Request DTOs ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  tenant_name: string;
  tenant_slug: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface StoreCreate {
  name: string;
  type: StoreType;
  address?: string;
}

export interface StoreUpdate {
  name?: string;
  type?: StoreType;
  address?: string;
  is_active?: boolean;
}

export interface ProductCreate {
  name: string;
  barcode: string;
  cost: number;
  price: number;
  category_id: number;
  brand_id: number;
}

export interface ProductUpdate {
  name?: string;
  barcode?: string;
  cost?: number;
  price?: number;
  category_id?: number;
  brand_id?: number;
}

export interface ProductVariantCreate {
  size_id: number;
}

export interface VariantStockCreate {
  variant_id: number;
  store_id: number;
  stock: number;
}

export interface VariantStockUpdate {
  stock: number;
}

export interface SaleItemCreate {
  variant_id: number;
  quantity: number;
}

export interface SaleCreate {
  store_id: number;
  items: SaleItemCreate[];
}

export interface ReturnItemRequest {
  sale_item_id: number;
  quantity: number;
}

export interface InventoryAdjustment {
  variant_id: number;
  store_id: number;
  quantity: number;
  notes?: string;
}

export interface UserCreate {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  store_id?: number;
}

export interface UserUpdate {
  full_name?: string;
  role?: UserRole;
  store_id?: number;
  is_active?: boolean;
}
