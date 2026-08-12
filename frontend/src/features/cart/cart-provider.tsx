"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/features/products/models";

export type CartItem = {
  product: Product;
  quantity: number;
};

type StoredCart = {
  version: 2;
  items: CartItem[];
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (product: Product, openDrawer?: boolean) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "terma-cart";
const CartContext = createContext<CartContextValue | null>(null);

function isProduct(value: unknown): value is Product {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Partial<Product>;
  return typeof product.id === "string"
    && typeof product.name === "string"
    && typeof product.priceValue === "number"
    && typeof product.stockQuantity === "number"
    && typeof product.image === "string";
}

function readStoredCart(value: string): CartItem[] {
  const parsed = JSON.parse(value) as Partial<StoredCart>;
  if (parsed.version !== 2 || !Array.isArray(parsed.items)) return [];
  return parsed.items.flatMap((item) => {
    if (!isProduct(item?.product) || !item.product.isActive || item.product.stockQuantity < 1) return [];
    const quantity = Math.max(1, Math.min(Number(item.quantity) || 1, item.product.stockQuantity));
    return [{ product: item.product, quantity }];
  });
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

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
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, items } satisfies StoredCart));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    isCartOpen,
    openCart,
    closeCart,
    toggleCart,
    addItem: (product, openDrawer = true) => {
      setItems((current) => {
        if (!product.isActive || product.stockQuantity < 1) return current;
        const existing = current.find((item) => item.product.id === product.id);
        return existing
          ? current.map((item) => item.product.id === product.id ? { ...item, product, quantity: Math.min(item.quantity + 1, product.stockQuantity) } : item)
          : [...current, { product, quantity: 1 }];
      });
      if (openDrawer) setIsCartOpen(true);
    },
    setQuantity: (productId, quantity) => setItems((current) => current.map((item) => item.product.id === productId
      ? { ...item, quantity: Math.max(1, Math.min(quantity, item.product.stockQuantity)) }
      : item)),
    removeItem: (productId) => setItems((current) => current.filter((item) => item.product.id !== productId)),
    clearCart: () => setItems([]),
  }), [hydrated, isCartOpen, items, openCart, closeCart, toggleCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
