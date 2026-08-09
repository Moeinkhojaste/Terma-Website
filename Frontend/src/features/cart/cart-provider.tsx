"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products } from "@/data/catalog/products";

export type CartItem = {
  productId: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  hydrated: boolean;
  addItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "terma-cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as CartItem[];
          const validItems = parsed.flatMap((item) => {
            const product = products.find((candidate) => candidate.id === item.productId);
            return product && product.stockQuantity > 0
              ? [{ productId: item.productId, quantity: Math.max(1, Math.min(Number(item.quantity) || 1, product.stockQuantity)) }]
              : [];
          });
          setItems(validItems);
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem: (productId) => setItems((current) => {
      const limit = products.find((product) => product.id === productId)?.stockQuantity ?? 0;
      if (limit < 1) return current;
      const existing = current.find((item) => item.productId === productId);
      return existing
        ? current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(item.quantity + 1, limit) } : item)
        : [...current, { productId, quantity: 1 }];
    }),
    setQuantity: (productId, quantity) => setItems((current) => {
      const limit = products.find((product) => product.id === productId)?.stockQuantity ?? 1;
      return current.map((item) => item.productId === productId
        ? { ...item, quantity: Math.max(1, Math.min(quantity, limit)) }
        : item);
    }),
    removeItem: (productId) => setItems((current) => current.filter((item) => item.productId !== productId)),
    clearCart: () => setItems([]),
  }), [hydrated, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
