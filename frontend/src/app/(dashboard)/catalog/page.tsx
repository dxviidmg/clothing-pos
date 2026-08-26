'use client';

import { useEffect, useState } from 'react';

import ProtectedRoute from '@/components/ProtectedRoute';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import type { Brand, Category, Size } from '@/types';
import { UserRole } from '@/types';

type TabKey = 'brands' | 'categories' | 'sizes';

interface TabConfig {
  key: TabKey;
  label: string;
  endpoint: string;
}

const tabs: TabConfig[] = [
  { key: 'brands', label: 'Marcas', endpoint: '/api/catalog/brands' },
  { key: 'categories', label: 'Categorías', endpoint: '/api/catalog/categories' },
  { key: 'sizes', label: 'Tallas', endpoint: '/api/catalog/sizes' },
];

function CatalogContent() {
  const [activeTab, setActiveTab] = useState<TabKey>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [newName, setNewName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [brandsData, categoriesData, sizesData] = await Promise.all([
        api.get<Brand[]>('/api/catalog/brands'),
        api.get<Category[]>('/api/catalog/categories'),
        api.get<Size[]>('/api/catalog/sizes'),
      ]);
      setBrands(brandsData);
      setCategories(categoriesData);
      setSizes(sizesData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al cargar catálogo';
      toast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentItems = (): { id: number; name: string }[] => {
    switch (activeTab) {
      case 'brands': return brands;
      case 'categories': return categories;
      case 'sizes': return sizes;
    }
  };

  const getCurrentEndpoint = (): string => {
    return tabs.find((t) => t.key === activeTab)!.endpoint;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    setIsSubmitting(true);
    try {
      const endpoint = getCurrentEndpoint();
      const created = await api.post<Brand | Category | Size>(endpoint, { name });

      switch (activeTab) {
        case 'brands':
          setBrands((prev) => [...prev, created as Brand]);
          break;
        case 'categories':
          setCategories((prev) => [...prev, created as Category]);
          break;
        case 'sizes':
          setSizes((prev) => [...prev, created as Size]);
          break;
      }

      setNewName('');
      toast('success', 'Elemento creado correctamente');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al crear elemento';
      toast('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
      <p className="text-gray-500 mt-1">Administra marcas, categorías y tallas</p>

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="mt-6">
        {/* Add form */}
        <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`Nombre de ${activeTab === 'brands' ? 'marca' : activeTab === 'categories' ? 'categoría' : 'talla'}`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Agregando...' : 'Agregar'}
          </button>
        </form>

        {/* List */}
        <div className="bg-white rounded-lg border border-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
            </div>
          ) : getCurrentItems().length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No hay elementos. Agrega uno nuevo arriba.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {getCurrentItems().map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm text-gray-900">{item.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
      <CatalogContent />
    </ProtectedRoute>
  );
}
