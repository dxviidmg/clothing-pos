"use client";

import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import ProtectedRoute from "@/components/ProtectedRoute";
import type {
  VariantStock,
  InventoryMovement,
  InventoryAdjustment,
  ProductWithVariants,
  Store,
  Size,
  MovementType,
} from "@/types";
import { UserRole } from "@/types";

type Tab = "stock" | "movimientos";

function movementBadgeVariant(
  type: MovementType
): "success" | "error" | "warning" | "info" | "neutral" {
  switch (type) {
    case "sale":
      return "success";
    case "cancellation":
      return "error";
    case "return":
      return "warning";
    case "adjustment":
      return "info";
    case "transfer_in":
      return "success";
    case "transfer_out":
      return "warning";
    case "restock":
      return "info";
    default:
      return "neutral";
  }
}

function movementLabel(type: MovementType): string {
  const labels: Record<string, string> = {
    sale: "Venta",
    cancellation: "Cancelación",
    return: "Devolución",
    adjustment: "Ajuste",
    transfer_in: "Entrada",
    transfer_out: "Salida",
    restock: "Restock",
  };
  return labels[type] || type;
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>("stock");

  return (
    <ProtectedRoute allowedRoles={[UserRole.OWNER, UserRole.ADMIN]}>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("stock")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "stock"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Stock
            </button>
            <button
              onClick={() => setActiveTab("movimientos")}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "movimientos"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Movimientos
            </button>
          </nav>
        </div>

        {activeTab === "stock" && <StockTab />}
        {activeTab === "movimientos" && <MovimientosTab />}
      </div>
    </ProtectedRoute>
  );
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

function StockTab() {
  const [stock, setStock] = useState<VariantStock[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [filterStoreId, setFilterStoreId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);

  const loadStock = useCallback(async (storeId?: number) => {
    try {
      const url = storeId
        ? `/api/inventory/stock?store_id=${storeId}`
        : "/api/inventory/stock";
      const data = await api.get<VariantStock[]>(url);
      setStock(data);
    } catch {
      toast("error", "Error al cargar stock");
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [productsData, storesData, sizesData] = await Promise.all([
          api.get<ProductWithVariants[]>("/api/products"),
          api.get<Store[]>("/api/stores"),
          api.get<Size[]>("/api/catalog/sizes"),
        ]);
        setProducts(productsData);
        setStores(storesData);
        setSizes(sizesData);
        await loadStock();
      } catch {
        toast("error", "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadStock]);

  useEffect(() => {
    loadStock(filterStoreId ? Number(filterStoreId) : undefined);
  }, [filterStoreId, loadStock]);

  const getSizeName = useCallback(
    (sizeId: number) => sizes.find((s) => s.id === sizeId)?.name || `Talla ${sizeId}`,
    [sizes]
  );

  const getStoreName = useCallback(
    (storeId: number) => stores.find((s) => s.id === storeId)?.name || `Tienda ${storeId}`,
    [stores]
  );

  const getProductAndVariantName = useCallback(
    (variantId: number): { productName: string; sizeName: string } => {
      for (const product of products) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) {
          return {
            productName: product.name,
            sizeName: getSizeName(variant.size_id),
          };
        }
      }
      return { productName: `Variante ${variantId}`, sizeName: "" };
    },
    [products, getSizeName]
  );

  const filteredStock = stock.filter((item) => {
    if (!search) return true;
    const { productName } = getProductAndVariantName(item.variant_id);
    return productName.toLowerCase().includes(search.toLowerCase());
  });

  const handleAdjustSubmit = async (adj: InventoryAdjustment) => {
    try {
      await api.post("/api/inventory/adjust", adj);
      toast("success", "Stock ajustado correctamente");
      setAdjustModalOpen(false);
      await loadStock(filterStoreId ? Number(filterStoreId) : undefined);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Error al ajustar stock");
    }
  };

  const handleRestockSubmit = async (adj: InventoryAdjustment) => {
    try {
      await api.post("/api/inventory/adjust", adj);
      toast("success", "Restock realizado correctamente");
      setRestockModalOpen(false);
      await loadStock(filterStoreId ? Number(filterStoreId) : undefined);
    } catch (err) {
      toast("error", err instanceof ApiError ? err.message : "Error al realizar restock");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filterStoreId}
            onChange={(e) =>
              setFilterStoreId(e.target.value ? Number(e.target.value) : "")
            }
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las tiendas</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Buscar producto..."
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setAdjustModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Ajustar stock
          </button>
          <button
            onClick={() => setRestockModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Restock
          </button>
        </div>
      </div>

      {/* Stock table */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Producto
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Talla/Variante
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Tienda
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                Stock
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredStock.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  No hay registros de stock
                </td>
              </tr>
            ) : (
              filteredStock.map((item) => {
                const { productName, sizeName } = getProductAndVariantName(
                  item.variant_id
                );
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{productName}</td>
                    <td className="px-4 py-3 text-gray-600">{sizeName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {getStoreName(item.store_id)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span
                        className={
                          item.stock <= 0
                            ? "text-red-600"
                            : item.stock <= 5
                            ? "text-yellow-600"
                            : "text-gray-900"
                        }
                      >
                        {item.stock}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust Modal */}
      <AdjustModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        onSubmit={handleAdjustSubmit}
        products={products}
        stores={stores}
        sizes={sizes}
        title="Ajustar stock"
        allowNegative={true}
      />

      {/* Restock Modal */}
      <AdjustModal
        isOpen={restockModalOpen}
        onClose={() => setRestockModalOpen(false)}
        onSubmit={handleRestockSubmit}
        products={products}
        stores={stores}
        sizes={sizes}
        title="Restock"
        allowNegative={false}
      />
    </div>
  );
}

// ─── Adjust/Restock Modal ─────────────────────────────────────────────────────

interface AdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryAdjustment) => Promise<void>;
  products: ProductWithVariants[];
  stores: Store[];
  sizes: Size[];
  title: string;
  allowNegative: boolean;
}

function AdjustModal({
  isOpen,
  onClose,
  onSubmit,
  products,
  stores,
  sizes,
  title,
  allowNegative,
}: AdjustModalProps) {
  const [variantId, setVariantId] = useState<number | "">("");
  const [storeId, setStoreId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSizeName = (sizeId: number) =>
    sizes.find((s) => s.id === sizeId)?.name || `Talla ${sizeId}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId || !storeId || quantity === 0) {
      toast("error", "Completa todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        variant_id: Number(variantId),
        store_id: Number(storeId),
        quantity,
        notes: notes.trim() || undefined,
      });
      // Reset
      setVariantId("");
      setStoreId("");
      setQuantity(0);
      setNotes("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Variant select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Producto / Variante
          </label>
          <select
            value={variantId}
            onChange={(e) => setVariantId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar variante</option>
            {products.map((product) =>
              product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {product.name} — {getSizeName(variant.size_id)}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Store select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tienda
          </label>
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : "")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar tienda</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cantidad {allowNegative && "(+/-)"}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setQuantity(allowNegative ? val : Math.abs(val));
            }}
            min={allowNegative ? undefined : 1}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Movimientos Tab ──────────────────────────────────────────────────────────

function MovimientosTab() {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [filterStoreId, setFilterStoreId] = useState<number | "">("");
  const [filterType, setFilterType] = useState<MovementType | "">("");
  const [isLoading, setIsLoading] = useState(true);

  const loadMovements = useCallback(
    async (storeId?: number, type?: MovementType) => {
      try {
        const params = new URLSearchParams();
        if (storeId) params.set("store_id", String(storeId));
        const url = `/api/inventory/movements${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        let data = await api.get<InventoryMovement[]>(url);
        if (type) {
          data = data.filter((m) => m.type === type);
        }
        setMovements(data);
      } catch {
        toast("error", "Error al cargar movimientos");
      }
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [storesData, productsData, sizesData] = await Promise.all([
          api.get<Store[]>("/api/stores"),
          api.get<ProductWithVariants[]>("/api/products"),
          api.get<Size[]>("/api/catalog/sizes"),
        ]);
        setStores(storesData);
        setProducts(productsData);
        setSizes(sizesData);
        await loadMovements();
      } catch {
        toast("error", "Error al cargar datos");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadMovements]);

  useEffect(() => {
    loadMovements(
      filterStoreId ? Number(filterStoreId) : undefined,
      filterType || undefined
    );
  }, [filterStoreId, filterType, loadMovements]);

  const getSizeName = useCallback(
    (sizeId: number) => sizes.find((s) => s.id === sizeId)?.name || `Talla ${sizeId}`,
    [sizes]
  );

  const getStoreName = useCallback(
    (storeId: number) => stores.find((s) => s.id === storeId)?.name || `Tienda ${storeId}`,
    [stores]
  );

  const getProductAndVariantName = useCallback(
    (variantId: number): string => {
      for (const product of products) {
        const variant = product.variants.find((v) => v.id === variantId);
        if (variant) {
          return `${product.name} — ${getSizeName(variant.size_id)}`;
        }
      }
      return `Variante ${variantId}`;
    },
    [products, getSizeName]
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={filterStoreId}
          onChange={(e) =>
            setFilterStoreId(e.target.value ? Number(e.target.value) : "")
          }
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
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as MovementType | "")}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los tipos</option>
          <option value="sale">Venta</option>
          <option value="cancellation">Cancelación</option>
          <option value="return">Devolución</option>
          <option value="adjustment">Ajuste</option>
          <option value="transfer_in">Entrada</option>
          <option value="transfer_out">Salida</option>
          <option value="restock">Restock</option>
        </select>
      </div>

      {/* Movements table */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Fecha
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Tipo
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Producto/Variante
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Tienda
              </th>
              <th className="text-right px-4 py-3 font-medium text-gray-700">
                Cantidad
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Notas
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No hay movimientos registrados
                </td>
              </tr>
            ) : (
              movements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {formatDate(movement.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={movementBadgeVariant(movement.type)}>
                      {movementLabel(movement.type)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {getProductAndVariantName(movement.variant_id)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getStoreName(movement.store_id)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <span
                      className={
                        movement.quantity > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {movement.user_id}
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                    {movement.notes || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
