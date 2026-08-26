'use client';

import { useEffect, useState } from 'react';

import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api, ApiError } from '@/lib/api';
import type { Store, StoreCreate, StoreUpdate } from '@/types';
import { StoreType, UserRole } from '@/types';

function StoresContent() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<StoreType>(StoreType.STORE);
  const [formAddress, setFormAddress] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<Store[]>('/api/stores');
      setStores(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al cargar tiendas';
      toast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingStore(null);
    setFormName('');
    setFormType(StoreType.STORE);
    setFormAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (store: Store) => {
    setEditingStore(store);
    setFormName(store.name);
    setFormType(store.type);
    setFormAddress(store.address || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStore(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingStore) {
        const body: StoreUpdate = {
          name: formName.trim(),
          type: formType,
          address: formAddress.trim() || undefined,
        };
        const updated = await api.put<Store>(`/api/stores/${editingStore.id}`, body);
        setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        toast('success', 'Tienda actualizada');
      } else {
        const body: StoreCreate = {
          name: formName.trim(),
          type: formType,
          address: formAddress.trim() || undefined,
        };
        const created = await api.post<Store>('/api/stores', body);
        setStores((prev) => [...prev, created]);
        toast('success', 'Tienda creada');
      }
      closeModal();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al guardar tienda';
      toast('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (store: Store) => {
    try {
      const body: StoreUpdate = { is_active: !store.is_active };
      const updated = await api.put<Store>(`/api/stores/${store.id}`, body);
      setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      toast('success', `Tienda ${updated.is_active ? 'activada' : 'desactivada'}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al actualizar tienda';
      toast('error', message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiendas</h1>
          <p className="text-gray-500 mt-1">Administra tus tiendas y bodegas</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Nueva tienda
        </button>
      </div>

      {/* Table */}
      <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : stores.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No hay tiendas registradas.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dirección
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {store.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={store.type === StoreType.STORE ? 'info' : 'neutral'}>
                      {store.type === StoreType.STORE ? 'Tienda' : 'Bodega'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {store.address || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={store.is_active ? 'success' : 'error'}>
                      {store.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                    <button
                      onClick={() => openEditModal(store)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleActive(store)}
                      className="text-gray-600 hover:text-gray-800 font-medium"
                    >
                      {store.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingStore ? 'Editar tienda' : 'Nueva tienda'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as StoreType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={StoreType.STORE}>Tienda</option>
              <option value={StoreType.WAREHOUSE}>Bodega</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Opcional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formName.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Guardando...' : editingStore ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function StoresPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER]}>
      <StoresContent />
    </ProtectedRoute>
  );
}
