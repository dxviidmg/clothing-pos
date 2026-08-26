"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import { SaleStatus } from "@/types";
import type { Sale, Store } from "@/types";

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [filterStoreId, setFilterStoreId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesData, storesData] = await Promise.all([
          api.get<Sale[]>("/api/sales"),
          api.get<Store[]>("/api/stores"),
        ]);
        setSales(salesData);
        setStores(storesData);
      } catch {
        toast("error", "Error al cargar ventas");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Reload sales when store filter changes
  useEffect(() => {
    if (isLoading) return;
    const loadSales = async () => {
      try {
        const endpoint = filterStoreId
          ? `/api/sales?store_id=${filterStoreId}`
          : "/api/sales";
        const salesData = await api.get<Sale[]>(endpoint);
        setSales(salesData);
      } catch {
        toast("error", "Error al cargar ventas");
      }
    };
    loadSales();
  }, [filterStoreId]);

  const getStoreName = (storeId: number) =>
    stores.find((s) => s.id === storeId)?.name || `Tienda #${storeId}`;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: SaleStatus) => {
    if (status === SaleStatus.COMPLETED) {
      return <Badge variant="success">Completada</Badge>;
    }
    return <Badge variant="error">Cancelada</Badge>;
  };

  // Apply client-side status filter
  const filteredSales = filterStatus
    ? sales.filter((s) => s.status === filterStatus)
    : sales;

  const columns = [
    {
      key: "id",
      label: "#",
      render: (sale: Sale) => <span className="font-medium">#{sale.id}</span>,
    },
    {
      key: "created_at",
      label: "Fecha",
      render: (sale: Sale) => formatDate(sale.created_at),
    },
    {
      key: "store_id",
      label: "Tienda",
      render: (sale: Sale) => getStoreName(sale.store_id),
    },
    {
      key: "total",
      label: "Total",
      render: (sale: Sale) => (
        <span className="font-medium">${Number(sale.total).toFixed(2)}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (sale: Sale) => getStatusBadge(sale.status),
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-500 mt-1">Historial de ventas realizadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          value={filterStoreId}
          onChange={(e) => setFilterStoreId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas las tiendas</option>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          <option value={SaleStatus.COMPLETED}>Completada</option>
          <option value={SaleStatus.CANCELLED}>Cancelada</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filteredSales}
        isLoading={isLoading}
        emptyMessage="No hay ventas registradas"
        onRowClick={(sale) => router.push(`/sales/${sale.id}`)}
      />
    </div>
  );
}
