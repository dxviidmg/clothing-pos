"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import type {
  Sale,
  SaleItem,
  Store,
  ProductWithVariants,
  Size,
  ReturnItemRequest,
} from "@/types";
import { SaleStatus, UserRole } from "@/types";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const saleId = params.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cancel modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Return modal
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItem, setReturnItem] = useState<SaleItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [isReturning, setIsReturning] = useState(false);

  const canManage =
    user?.role === UserRole.OWNER || user?.role === UserRole.ADMIN;

  const loadSale = async () => {
    try {
      const saleData = await api.get<Sale>(`/api/sales/${saleId}`);
      setSale(saleData);
    } catch {
      toast("error", "Error al cargar la venta");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [saleData, storesData, productsData, sizesData] =
          await Promise.all([
            api.get<Sale>(`/api/sales/${saleId}`),
            api.get<Store[]>("/api/stores"),
            api.get<ProductWithVariants[]>("/api/products"),
            api.get<Size[]>("/api/catalog/sizes"),
          ]);
        setSale(saleData);
        setStores(storesData);
        setProducts(productsData);
        setSizes(sizesData);
      } catch {
        toast("error", "Error al cargar datos de la venta");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [saleId]);

  const getStoreName = (storeId: number) =>
    stores.find((s) => s.id === storeId)?.name || `Tienda #${storeId}`;

  const getProductNameForVariant = (variantId: number) => {
    for (const product of products) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) return product.name;
    }
    return `Producto (variante #${variantId})`;
  };

  const getSizeNameForVariant = (variantId: number) => {
    for (const product of products) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (variant) {
        return sizes.find((s) => s.id === variant.size_id)?.name || "—";
      }
    }
    return "—";
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === SaleStatus.COMPLETED) {
      return <Badge variant="success">Completada</Badge>;
    }
    return <Badge variant="error">Cancelada</Badge>;
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await api.post(`/api/sales/${saleId}/cancel`);
      toast("success", "Venta cancelada exitosamente");
      await loadSale();
    } catch (err) {
      toast(
        "error",
        err instanceof ApiError ? err.message : "Error al cancelar la venta"
      );
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };

  const handleReturn = async () => {
    if (!returnItem) return;

    setIsReturning(true);
    try {
      const body: ReturnItemRequest = {
        sale_item_id: returnItem.id,
        quantity: returnQuantity,
      };
      await api.post(`/api/sales/${saleId}/return`, body);
      toast("success", "Devolución registrada exitosamente");
      await loadSale();
    } catch (err) {
      toast(
        "error",
        err instanceof ApiError ? err.message : "Error al procesar devolución"
      );
    } finally {
      setIsReturning(false);
      setShowReturnModal(false);
      setReturnItem(null);
      setReturnQuantity(1);
    }
  };

  const openReturnModal = (item: SaleItem) => {
    setReturnItem(item);
    setReturnQuantity(1);
    setShowReturnModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Venta no encontrada</p>
        <button
          onClick={() => router.push("/sales")}
          className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Volver a ventas
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/sales")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-2 inline-block"
          >
            ← Volver a ventas
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Venta #{sale.id}
          </h1>
        </div>

        {canManage && sale.status === SaleStatus.COMPLETED && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Cancelar venta
          </button>
        )}
      </div>

      {/* Sale info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Fecha
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {formatDate(sale.created_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Tienda
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {getStoreName(sale.store_id)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Total
            </p>
            <p className="text-sm font-bold text-gray-900 mt-1">
              ${Number(sale.total).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              Estado
            </p>
            <div className="mt-1">{getStatusBadge(sale.status)}</div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-medium text-gray-700">
            Artículos de la venta
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio unit.
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devueltos
                </th>
                {canManage && sale.status === SaleStatus.COMPLETED && (
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sale.items.map((item) => {
                const maxReturnable = item.quantity - item.returned_qty;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getProductNameForVariant(item.variant_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {getSizeNameForVariant(item.variant_id)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      ${Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      ${(Number(item.unit_price) * item.quantity).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">
                      {item.returned_qty > 0 ? (
                        <span className="text-orange-600 font-medium">
                          {item.returned_qty}
                        </span>
                      ) : (
                        "0"
                      )}
                    </td>
                    {canManage && sale.status === SaleStatus.COMPLETED && (
                      <td className="px-4 py-3 text-sm text-right">
                        {maxReturnable > 0 && (
                          <button
                            onClick={() => openReturnModal(item)}
                            className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                          >
                            Devolución
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel confirmation modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar venta"
      >
        <p className="text-sm text-gray-600 mb-6">
          ¿Estás seguro de que deseas cancelar la venta #{sale.id}? Esta acción
          revertirá el inventario y no se puede deshacer.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowCancelModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            No, mantener
          </button>
          <button
            onClick={handleCancel}
            disabled={isCancelling}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isCancelling ? "Cancelando..." : "Sí, cancelar venta"}
          </button>
        </div>
      </Modal>

      {/* Return modal */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => {
          setShowReturnModal(false);
          setReturnItem(null);
        }}
        title="Registrar devolución"
      >
        {returnItem && (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Producto:{" "}
                <span className="font-medium">
                  {getProductNameForVariant(returnItem.variant_id)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Talla:{" "}
                <span className="font-medium">
                  {getSizeNameForVariant(returnItem.variant_id)}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                Máximo a devolver:{" "}
                <span className="font-medium">
                  {returnItem.quantity - returnItem.returned_qty}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a devolver
              </label>
              <input
                type="number"
                min={1}
                max={returnItem.quantity - returnItem.returned_qty}
                value={returnQuantity}
                onChange={(e) => setReturnQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReturn}
                disabled={
                  isReturning ||
                  returnQuantity < 1 ||
                  returnQuantity > returnItem.quantity - returnItem.returned_qty
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isReturning ? "Procesando..." : "Registrar devolución"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
