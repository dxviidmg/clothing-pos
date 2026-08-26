'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import type {
  ProductWithVariants,
  ProductUpdate,
  ProductVariant,
  Brand,
  Category,
  Size,
  Store,
  VariantStock,
  VariantStockCreate,
} from '@/types';
import { UserRole } from '@/types';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [stock, setStock] = useState<VariantStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState<ProductUpdate>({});
  const [newSizeId, setNewSizeId] = useState<number>(0);
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  // Stock initialization state
  const [stockForm, setStockForm] = useState<{ variantId: number; storeId: number; stock: number } | null>(null);
  const [isSavingStock, setIsSavingStock] = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const [productData, brandsData, categoriesData, sizesData, storesData, stockData] =
        await Promise.all([
          api.get<ProductWithVariants>(`/api/products/${productId}`),
          api.get<Brand[]>('/api/catalog/brands'),
          api.get<Category[]>('/api/catalog/categories'),
          api.get<Size[]>('/api/catalog/sizes'),
          api.get<Store[]>('/api/stores'),
          api.get<VariantStock[]>('/api/inventory/stock'),
        ]);
      setProduct(productData);
      setBrands(brandsData);
      setCategories(categoriesData);
      setSizes(sizesData);
      setStores(storesData);
      setStock(stockData);
      setForm({
        name: productData.name,
        barcode: productData.barcode,
        cost: productData.cost,
        price: productData.price,
        category_id: productData.category_id,
        brand_id: productData.brand_id,
      });
    } catch {
      toast('error', 'Error al cargar producto');
      router.push('/products');
    } finally {
      setIsLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await api.put<ProductWithVariants>(
        `/api/products/${productId}`,
        form
      );
      setProduct(updated);
      toast('success', 'Producto actualizado');
    } catch (err) {
      toast(
        'error',
        err instanceof ApiError ? err.message : 'Error al actualizar producto'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVariant = async () => {
    if (!newSizeId) {
      toast('error', 'Selecciona una talla');
      return;
    }
    setIsAddingVariant(true);
    try {
      await api.post<ProductVariant>(`/api/products/${productId}/variants`, {
        size_id: newSizeId,
      });
      toast('success', 'Variante agregada');
      setNewSizeId(0);
      await loadProduct();
    } catch (err) {
      toast(
        'error',
        err instanceof ApiError ? err.message : 'Error al agregar variante'
      );
    } finally {
      setIsAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    try {
      await api.delete(`/api/products/${productId}/variants/${variantId}`);
      toast('success', 'Variante eliminada');
      await loadProduct();
    } catch (err) {
      toast(
        'error',
        err instanceof ApiError ? err.message : 'Error al eliminar variante'
      );
    }
  };

  const handleInitStock = async () => {
    if (!stockForm) return;
    setIsSavingStock(true);
    try {
      const payload: VariantStockCreate = {
        variant_id: stockForm.variantId,
        store_id: stockForm.storeId,
        stock: stockForm.stock,
      };
      await api.post('/api/inventory/stock', payload);
      toast('success', 'Stock inicializado');
      setStockForm(null);
      // Reload stock data
      const stockData = await api.get<VariantStock[]>('/api/inventory/stock');
      setStock(stockData);
    } catch (err) {
      toast(
        'error',
        err instanceof ApiError ? err.message : 'Error al inicializar stock'
      );
    } finally {
      setIsSavingStock(false);
    }
  };

  const getSizeName = (sizeId: number) =>
    sizes.find((s) => s.id === sizeId)?.name || `Talla ${sizeId}`;

  const getStoreName = (storeId: number) =>
    stores.find((s) => s.id === storeId)?.name || `Tienda ${storeId}`;

  const getVariantStock = (variantId: number) =>
    stock.filter((s) => s.variant_id === variantId);

  // Sizes not yet used in variants
  const availableSizes = sizes.filter(
    (s) => !product?.variants.some((v) => v.size_id === s.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/products')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Productos
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Editar producto</h1>
        </div>

        {/* Product form */}
        <form
          onSubmit={handleSave}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              value={form.name || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de barras
            </label>
            <input
              type="text"
              name="barcode"
              value={form.barcode || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Costo
              </label>
              <input
                type="number"
                name="cost"
                value={form.cost ?? 0}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio
              </label>
              <input
                type="number"
                name="price"
                value={form.price ?? 0}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                name="category_id"
                value={form.category_id || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Seleccionar categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <select
                name="brand_id"
                value={form.brand_id || 0}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0}>Seleccionar marca</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>

        {/* Variants section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Variantes</h2>

          {/* Existing variants */}
          {product.variants.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay variantes. Agrega una talla para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              {product.variants.map((variant) => {
                const variantStockItems = getVariantStock(variant.id);
                return (
                  <div
                    key={variant.id}
                    className="border border-gray-200 rounded-md p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900">
                        {getSizeName(variant.size_id)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setStockForm({
                              variantId: variant.id,
                              storeId: stores[0]?.id || 0,
                              stock: 0,
                            })
                          }
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          + Stock
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(variant.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {/* Stock per store */}
                    {variantStockItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {variantStockItems.map((vs) => (
                          <span
                            key={vs.id}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {getStoreName(vs.store_id)}: {vs.stock}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">Sin stock registrado</p>
                    )}

                    {/* Inline stock form for this variant */}
                    {stockForm && stockForm.variantId === variant.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                        <select
                          value={stockForm.storeId}
                          onChange={(e) =>
                            setStockForm((prev) =>
                              prev ? { ...prev, storeId: Number(e.target.value) } : null
                            )
                          }
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {stores.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={stockForm.stock}
                          onChange={(e) =>
                            setStockForm((prev) =>
                              prev ? { ...prev, stock: Number(e.target.value) } : null
                            )
                          }
                          min="0"
                          placeholder="Cantidad"
                          className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleInitStock}
                          disabled={isSavingStock}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isSavingStock ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => setStockForm(null)}
                          className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add variant */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2">
            <select
              value={newSizeId}
              onChange={(e) => setNewSizeId(Number(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>Seleccionar talla...</option>
              {availableSizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddVariant}
              disabled={isAddingVariant || !newSizeId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingVariant ? 'Agregando...' : 'Agregar variante'}
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
