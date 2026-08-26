'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { api } from '@/lib/api';
import { toast } from '@/components/ui/Toast';
import DataTable from '@/components/ui/DataTable';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { ProductWithVariants, Brand, Category } from '@/types';
import { UserRole } from '@/types';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | ''>('');
  const [filterBrand, setFilterBrand] = useState<number | ''>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, brandsData, categoriesData] = await Promise.all([
          api.get<ProductWithVariants[]>('/api/products'),
          api.get<Brand[]>('/api/catalog/brands'),
          api.get<Category[]>('/api/catalog/categories'),
        ]);
        setProducts(productsData);
        setBrands(brandsData);
        setCategories(categoriesData);
      } catch {
        toast('error', 'Error al cargar productos');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
    }

    if (filterCategory) {
      result = result.filter((p) => p.category_id === filterCategory);
    }

    if (filterBrand) {
      result = result.filter((p) => p.brand_id === filterBrand);
    }

    return result;
  }, [products, search, filterCategory, filterBrand]);

  const getCategoryName = (categoryId: number) =>
    categories.find((c) => c.id === categoryId)?.name || '—';

  const getBrandName = (brandId: number) =>
    brands.find((b) => b.id === brandId)?.name || '—';

  const columns = [
    { key: 'name', label: 'Nombre' },
    { key: 'barcode', label: 'Código de barras' },
    {
      key: 'category_id',
      label: 'Categoría',
      render: (item: ProductWithVariants) => getCategoryName(item.category_id),
    },
    {
      key: 'brand_id',
      label: 'Marca',
      render: (item: ProductWithVariants) => getBrandName(item.brand_id),
    },
    {
      key: 'price',
      label: 'Precio',
      render: (item: ProductWithVariants) => `$${Number(item.price).toFixed(2)}`,
    },
    {
      key: 'cost',
      label: 'Costo',
      render: (item: ProductWithVariants) => `$${Number(item.cost).toFixed(2)}`,
    },
  ];

  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <button
            onClick={() => router.push('/products/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Nuevo producto
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value ? Number(e.target.value) : '')
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterBrand}
            onChange={(e) =>
              setFilterBrand(e.target.value ? Number(e.target.value) : '')
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={filteredProducts}
          onRowClick={(item) => router.push(`/products/${item.id}`)}
          emptyMessage="No se encontraron productos"
          isLoading={isLoading}
        />
      </div>
    </ProtectedRoute>
  );
}
