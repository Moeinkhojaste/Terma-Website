"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/features/products/components/product-card";
import { getRecommendations } from "@/features/products/product-api";
import type { Product } from "@/features/products/models";

export function ProductRecommendations({ productId, variantId }: { productId: string; variantId?: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    getRecommendations(productId, variantId, 4, controller.signal).then(setProducts).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setProducts([]);
    });
    return () => controller.abort();
  }, [productId, variantId]);
  if (products.length === 0) return null;
  return <section className="related-products section-pad"><Container><div className="catalog-toolbar"><h2>محصولات مشابه</h2><Link href="/products">مشاهده همه محصولات</Link></div><div className="products-grid products-grid--related">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div></Container></section>;
}
