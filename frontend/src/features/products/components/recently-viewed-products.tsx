"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/features/products/components/product-card";
import { listProducts, lookupProducts } from "@/features/products/product-api";
import { readRecentlyViewed } from "@/features/products/recently-viewed";
import type { Product } from "@/features/products/models";

export function RecentlyViewedProducts({ currentProductId, title, compact = false }: { currentProductId?: string; title?: string; compact?: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [source, setSource] = useState<"history" | "suggestions">("suggestions");

  useEffect(() => {
    const controller = new AbortController();
    const ids = readRecentlyViewed().filter((id) => id !== currentProductId).slice(0, 8);
    const load = ids.length > 0
      ? lookupProducts(ids, controller.signal)
      : listProducts({ inStock: true, pageSize: currentProductId ? 8 : 4 }, controller.signal).then((page) => page.items);
    load.then((items) => {
      setProducts(items.filter((product) => product.id !== currentProductId));
      setSource(ids.length > 0 ? "history" : "suggestions");
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setProducts([]);
    });
    return () => controller.abort();
  }, [currentProductId]);

  if (products.length === 0) return null;
  return (
    <section className={compact ? "recent-products recent-products--compact" : "recent-products"} aria-labelledby={`recent-title-${currentProductId ?? "list"}`}>
      <div className="catalog-toolbar"><h2 id={`recent-title-${currentProductId ?? "list"}`}>{title ?? (source === "history" ? "محصولات دیده‌شده اخیر" : "پیشنهاد برای ادامه خرید")}</h2></div>
      <div className="products-grid products-grid--related">
        {products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}
      </div>
    </section>
  );
}
