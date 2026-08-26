'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import StatCard from '@/components/ui/StatCard';
import { toast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import type { Sale, ProductWithVariants, VariantStock } from '@/types';

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [stock, setStock] = useState<VariantStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [salesData, productsData, stockData] = await Promise.all([
        api.get<Sale[]>('/api/sales'),
        api.get<ProductWithVariants[]>('/api/products'),
        api.get<VariantStock[]>('/api/inventory/stock'),
      ]);
      setSales(salesData);
      setProducts(productsData);
      setStock(stockData);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al cargar datos';
      toast('error', message);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate today's sales
  const today = new Date().toISOString().split('T')[0];
  const todaySales = sales.filter((s) => s.created_at.startsWith(today));
  const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  // Low stock items (stock < 5)
  const lowStockCount = stock.filter((s) => s.stock < 5).length;

  // Last 5 sales
  const lastSales = [...sales]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-1">Resumen de tu negocio</p>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <StatCard
          title="Ventas hoy"
          value={todaySales.length}
          icon="🛒"
          subtitle={`$${todayTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
        />
        <StatCard
          title="Productos totales"
          value={products.length}
          icon="📦"
        />
        <StatCard
          title="Stock bajo"
          value={lowStockCount}
          icon="⚠️"
          subtitle="Items con menos de 5 unidades"
        />
      </div>

      {/* Last sales */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimas ventas</h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {lastSales.length === 0 ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              No hay ventas registradas.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lastSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      #{sale.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(sale.created_at).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.items.length} producto{sale.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8 flex gap-4">
        <Link
          href="/pos"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Ir al POS
        </Link>
        <Link
          href="/inventory"
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
        >
          Ver inventario
        </Link>
      </div>
    </div>
  );
}
