"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import type {
  ProductWithVariants,
  Store,
  Size,
  VariantStock,
  SaleCreate,
  Sale,
} from "@/types";

interface CartItem {
  variant_id: number;
  product_name: string;
  size_name: string;
  quantity: number;
  unit_price: number;
  available_stock: number;
}

export default function POSPage() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [sizes, setSizes] = useState<Size[]>([]);
  const [stock, setStock] = useState<VariantStock[]>([]);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductWithVariants[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storesData, sizesData, productsData] = await Promise.all([
          api.get<Store[]>("/api/stores"),
          api.get<Size[]>("/api/catalog/sizes"),
          api.get<ProductWithVariants[]>("/api/products"),
        ]);
        setStores(storesData);
        setSizes(sizesData);
        setProducts(productsData);

        // Auto-select store
        if (user?.store_id) {
          setSelectedStoreId(user.store_id);
        } else if (storesData.length === 1) {
          setSelectedStoreId(storesData[0].id);
        }
      } catch {
        toast("error", "Error al cargar datos");
      }
    };
    loadData();
  }, [user]);

  // Load stock when store changes
  useEffect(() => {
    if (!selectedStoreId) return;
    const loadStock = async () => {
      try {
        const stockData = await api.get<VariantStock[]>(
          `/api/inventory/stock?store_id=${selectedStoreId}`
        );
        setStock(stockData);
      } catch {
        toast("error", "Error al cargar stock");
      }
    };
    loadStock();
  }, [selectedStoreId]);

  // Focus barcode input
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const getSizeName = useCallback(
    (sizeId: number) => sizes.find((s) => s.id === sizeId)?.name || `Talla ${sizeId}`,
    [sizes]
  );

  const getVariantStock = useCallback(
    (variantId: number) => stock.find((s) => s.variant_id === variantId)?.stock || 0,
    [stock]
  );

  // Search products
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      const q = query.toLowerCase();
      const results = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
      setSearchResults(results);
    },
    [products]
  );

  // Barcode scan (enter key)
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const product = await api.get<ProductWithVariants>(
        `/api/products/barcode/${encodeURIComponent(searchQuery.trim())}`
      );
      // If product has only one variant, add directly
      if (product.variants.length === 1) {
        addToCart(product, product.variants[0].id);
      } else {
        setSearchResults([product]);
      }
    } catch {
      // Not found by barcode, keep search results
      handleSearch(searchQuery);
    }
    setSearchQuery("");
    barcodeInputRef.current?.focus();
  };

  const addToCart = (product: ProductWithVariants, variantId: number) => {
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const availableStock = getVariantStock(variantId);
    const existingIndex = cart.findIndex((item) => item.variant_id === variantId);

    if (existingIndex >= 0) {
      const existing = cart[existingIndex];
      if (existing.quantity >= availableStock) {
        toast("error", "Sin stock disponible");
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1,
      };
      setCart(updatedCart);
    } else {
      if (availableStock <= 0) {
        toast("error", "Sin stock disponible");
        return;
      }
      setCart([
        ...cart,
        {
          variant_id: variantId,
          product_name: product.name,
          size_name: getSizeName(variant.size_id),
          quantity: 1,
          unit_price: product.price,
          available_stock: availableStock,
        },
      ]);
    }

    setSearchResults([]);
    barcodeInputRef.current?.focus();
  };

  const updateCartQuantity = (variantId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.variant_id !== variantId) return item;
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.available_stock) {
            toast("error", "Sin stock suficiente");
            return item;
          }
          return { ...item, quantity: newQty };
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (variantId: number) => {
    setCart((prev) => prev.filter((item) => item.variant_id !== variantId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );

  const handleCheckout = async () => {
    if (!selectedStoreId || cart.length === 0) return;

    setIsProcessing(true);
    try {
      const saleData: SaleCreate = {
        store_id: selectedStoreId,
        items: cart.map((item) => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
      };

      const sale = await api.post<Sale>("/api/sales", saleData);
      toast("success", `Venta #${sale.id} registrada — $${Number(sale.total).toFixed(2)}`);
      setCart([]);

      // Refresh stock
      const stockData = await api.get<VariantStock[]>(
        `/api/inventory/stock?store_id=${selectedStoreId}`
      );
      setStock(stockData);
    } catch (err) {
      toast(
        "error",
        err instanceof ApiError ? err.message : "Error al procesar venta"
      );
    } finally {
      setIsProcessing(false);
      barcodeInputRef.current?.focus();
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Panel - Search & Products */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Store selector + Search */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          {stores.length > 1 && (
            <select
              value={selectedStoreId || ""}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar tienda</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          )}

          <form onSubmit={handleBarcodeSubmit} className="flex-1">
            <input
              ref={barcodeInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="🔍 Escanear código o buscar producto..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </form>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-lg p-3"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-xs text-gray-500">{product.barcode}</p>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      ${Number(product.price).toFixed(2)}
                    </span>
                  </div>
                  {/* Variant buttons */}
                  <div className="flex flex-wrap gap-1">
                    {product.variants.map((variant) => {
                      const variantStock = getVariantStock(variant.id);
                      return (
                        <button
                          key={variant.id}
                          onClick={() => addToCart(product, variant.id)}
                          disabled={variantStock <= 0}
                          className={`px-2 py-1 text-xs rounded border transition-colors ${
                            variantStock > 0
                              ? "border-blue-300 text-blue-700 hover:bg-blue-50"
                              : "border-gray-200 text-gray-400 cursor-not-allowed"
                          }`}
                        >
                          {getSizeName(variant.size_id)} ({variantStock})
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No se encontraron productos
            </p>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              Escanea un código de barras o busca un producto
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-full lg:w-96 bg-white border border-gray-200 rounded-lg flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Carrito ({cart.length} items)
          </h2>
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Carrito vacío
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.variant_id}
                className="flex items-center justify-between gap-2 pb-3 border-b border-gray-100 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.product_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.size_name} · ${Number(item.unit_price).toFixed(2)}
                  </p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateCartQuantity(item.variant_id, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-sm font-medium">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.variant_id, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>

                {/* Line total + remove */}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.variant_id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">
              ${cartTotal.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || !selectedStoreId || isProcessing}
            className="w-full py-3 bg-green-600 text-white rounded-md font-medium text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isProcessing ? "Procesando..." : "💵 Cobrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
