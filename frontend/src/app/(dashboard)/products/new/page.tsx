'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { Brand, Category, Product, ProductCreate } from '@/types';
import { UserRole } from '@/types';

export default function NewProductPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState<ProductCreate>({
    name: '',
    barcode: '',
    cost: 0,
    price: 0,
    category_id: 0,
    brand_id: 0,
  });

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [brandsData, categoriesData] = await Promise.all([
          api.get<Brand[]>('/api/catalog/brands'),
          api.get<Category[]>('/api/catalog/categories'),
        ]);
        setBrands(brandsData);
        setCategories(categoriesData);
      } catch {
        toast('error', 'Error al cargar catálogos');
      }
    };
    loadCatalog();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast('error', 'El nombre es requerido');
      return;
    }
    if (!form.barcode.trim()) {
      toast('error', 'El código de barras es requerido');
      return;
    }
    if (!form.category_id) {
      toast('error', 'Selecciona una categoría');
      return;
    }
    if (!form.brand_id) {
      toast('error', 'Selecciona una marca');
      return;
    }

    setIsSubmitting(true);
    try {
      const product = await api.post<Product>('/api/products', form);
      toast('success', 'Producto creado exitosamente');
      router.push(`/products/${product.id}`);
    } catch (err) {
      toast(
        'error',
        err instanceof ApiError ? err.message : 'Error al crear producto'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Volver
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo producto</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del producto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código de barras
            </label>
            <input
              type="text"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Código de barras"
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
                value={form.cost}
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
                value={form.price}
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
                value={form.category_id}
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
                value={form.brand_id}
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

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Creando...' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
