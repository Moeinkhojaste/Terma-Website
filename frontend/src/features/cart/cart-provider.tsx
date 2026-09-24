"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useFeedback } from "@/components/ui/feedback-provider";
import type { Product } from "@/features/products/models";
import { apiRequest } from "@/lib/api-client";

export type PackagingType = "Standard" | "GiftBox";

export type CartItem = {
  lineId: string;
  productId: string;
  variantId?: string;
  packagingType: PackagingType;
  packagingFee: number;
  product: Product;
  quantity: number;
};

type StoredCartV3 = { version: 3; items: CartItem[] };
type LegacyCartV2 = { version: 2; items: { product: Product; quantity: number }[] };

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, packagingTypeOrOpenDrawer?: PackagingType | boolean, packagingFee?: number, openDrawer?: boolean) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  removeItem: (lineId: string) => void;
  clearCart: () => void;
  toggleItemPackaging: (lineId: string, defaultGiftFee?: number) => void;
  getLineId: (product: Pick<Product, "id" | "variantId">, packagingType?: PackagingType) => string;
};

const STORAGE_KEY = "terma-cart";
const SESSION_KEY = "terma-cart-session-key";
const CartContext = createContext<CartContextValue | null>(null);

function getOrCreateSessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = window.localStorage.getItem(SESSION_KEY);
  if (!key) {
    key = "cs_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    window.localStorage.setItem(SESSION_KEY, key);
  }
  return key;
}

export function getCartLineId(
  product: Pick<Product, "id" | "variantId">,
  packagingType: PackagingType = "Standard"
) {
  return `${product.id}:${product.variantId ?? "default"}:${packagingType}`;
}

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Partial<Product>;
  return typeof product.id === "string" && typeof product.name === "string" && typeof product.priceValue === "number"
    && typeof product.stockQuantity === "number" && typeof product.image === "string";
}

function sanitizeItem(
  product: Product,
  quantity: number,
  storedVariantId?: string,
  packagingType: PackagingType = "Standard",
  packagingFee = 0
): CartItem | undefined {
  if (!isProduct(product) || !product.isActive || product.stockQuantity < 1) return;
  const variantId = storedVariantId ?? product.variantId ?? product.capacities?.find((option) => option.tableCapacity === product.size)?.id;
  const snapshot = variantId === product.variantId ? product : { ...product, variantId };
  const pkgType: PackagingType = packagingType === "GiftBox" ? "GiftBox" : "Standard";
  const pkgFee = typeof packagingFee === "number" && packagingFee >= 0 ? packagingFee : 0;
  return {
    lineId: getCartLineId(snapshot, pkgType),
    productId: product.id,
    variantId,
    packagingType: pkgType,
    packagingFee: pkgFee,
    product: snapshot,
    quantity: Math.max(1, Math.min(Number(quantity) || 1, product.stockQuantity)),
  };
}

function mergeLines(items: CartItem[]) {
  const lines = new Map<string, CartItem>();
  for (const item of items) {
    const existing = lines.get(item.lineId);
    lines.set(item.lineId, existing
      ? { ...item, quantity: Math.min(existing.quantity + item.quantity, item.product.stockQuantity) }
      : item);
  }
  return [...lines.values()];
}

export function readStoredCart(value: string): CartItem[] {
  const parsed = JSON.parse(value) as { version?: unknown; items?: unknown[] };
  if (parsed.version === 3 && Array.isArray(parsed.items)) {
    return mergeLines(parsed.items.flatMap((item) => {
      const candidate = item as Partial<CartItem>;
      if (!isProduct(candidate.product)) return [];
      const sanitized = sanitizeItem(
        candidate.product,
        candidate.quantity ?? 1,
        candidate.variantId,
        candidate.packagingType ?? "Standard",
        candidate.packagingFee ?? 0
      );
      if (!sanitized) return [];
      return [sanitized];
    }));
  }
  if (parsed.version === 2 && Array.isArray(parsed.items)) {
    return mergeLines(parsed.items.flatMap((item) => {
      const candidate = item as Partial<LegacyCartV2["items"][number]>;
      if (!isProduct(candidate.product)) return [];
      const sanitized = sanitizeItem(candidate.product, candidate.quantity ?? 1);
      return sanitized ? [sanitized] : [];
    }));
  }
  return [];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { showFeedback } = useFeedback();

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((previous) => !previous), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) setItems(readStoredCart(stored));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, items } satisfies StoredCartV3));

    const sessionKey = getOrCreateSessionKey();
    if (!sessionKey) return;

    const timeout = window.setTimeout(() => {
      const syncItems = items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        productName: item.product.name,
        sku: item.product.sku,
        unitPrice: item.product.priceValue,
        quantity: item.quantity,
      }));

      apiRequest("/api/store/cart/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKey,
          items: syncItems,
        }),
      }).catch(() => {});
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [hydrated, items]);

  const addItem = useCallback((
    product: Product,
    packagingTypeOrOpenDrawer: PackagingType | boolean = "Standard",
    packagingFee = 0,
    openDrawer = true
  ) => {
    let resolvedPackaging: PackagingType = "Standard";
    const resolvedFee = packagingFee;
    let resolvedOpenDrawer = openDrawer;

    if (typeof packagingTypeOrOpenDrawer === "boolean") {
      resolvedOpenDrawer = packagingTypeOrOpenDrawer;
    } else {
      resolvedPackaging = packagingTypeOrOpenDrawer;
    }

    if (!product.isActive || product.stockQuantity < 1) return;
    const lineId = getCartLineId(product, resolvedPackaging);
    setItems((current) => {
      const existing = current.find((item) => item.lineId === lineId);
      return existing
        ? current.map((item) => item.lineId === lineId ? { ...item, product, packagingType: resolvedPackaging, packagingFee: resolvedFee, quantity: Math.min(item.quantity + 1, product.stockQuantity) } : item)
        : [...current, { lineId, productId: product.id, variantId: product.variantId, packagingType: resolvedPackaging, packagingFee: resolvedFee, product, quantity: 1 }];
    });
    showFeedback(`${product.name} به سبد خرید اضافه شد.`);
    if (resolvedOpenDrawer) setIsCartOpen(true);
  }, [showFeedback]);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((current) => current.map((item) => item.lineId === lineId
      ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stockQuantity)) }
      : item));
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((current) => {
      const removed = current.find((item) => item.lineId === lineId);
      if (!removed) return current;
      showFeedback(`${removed.product.name} از سبد حذف شد.`, {
        actionLabel: "بازگردانی",
        onAction: () => setItems((latest) => latest.some((item) => item.lineId === lineId) ? latest : [...latest, removed]),
        duration: 5000,
      });
      return current.filter((item) => item.lineId !== lineId);
    });
  }, [showFeedback]);

  const toggleItemPackaging = useCallback((lineId: string, defaultGiftFee = 200000) => {
    setItems((current) => {
      const targetItem = current.find((item) => item.lineId === lineId);
      if (!targetItem) return current;

      const newPackaging: PackagingType = targetItem.packagingType === "GiftBox" ? "Standard" : "GiftBox";
      const newFee = newPackaging === "GiftBox" ? (targetItem.packagingFee > 0 ? targetItem.packagingFee : defaultGiftFee) : 0;
      const newLineId = getCartLineId(targetItem.product, newPackaging);

      const existingSameLine = current.find((item) => item.lineId === newLineId);
      if (existingSameLine) {
        return current
          .filter((item) => item.lineId !== lineId)
          .map((item) => item.lineId === newLineId
            ? { ...item, quantity: Math.min(item.quantity + targetItem.quantity, item.product.stockQuantity) }
            : item
          );
      }

      return current.map((item) => item.lineId === lineId
        ? { ...item, lineId: newLineId, packagingType: newPackaging, packagingFee: newFee }
        : item
      );
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo<CartContextValue>(() => ({
    items, hydrated, itemCount: items.reduce((total, item) => total + item.quantity, 0), isCartOpen,
    openCart, closeCart, toggleCart, addItem, setQuantity, removeItem, clearCart, toggleItemPackaging, getLineId: getCartLineId,
  }), [items, hydrated, isCartOpen, openCart, closeCart, toggleCart, addItem, setQuantity, removeItem, clearCart, toggleItemPackaging]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
