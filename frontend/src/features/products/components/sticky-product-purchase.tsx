"use client";

import { useEffect, useState, type RefObject } from "react";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import type { Product } from "@/features/products/models";

export function StickyProductPurchase({ product, purchaseAnchor }: { product: Product; purchaseAnchor: RefObject<HTMLElement | null> }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const anchor = purchaseAnchor.current;
    if (!anchor || typeof IntersectionObserver === "undefined") return;
    const update = () => {
      const bounds = anchor.getBoundingClientRect();
      setVisible(bounds.bottom < 0);
    };
    const observer = new IntersectionObserver(update, { threshold: 0 });
    observer.observe(anchor);
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", update); };
  }, [purchaseAnchor]);

  const isUnavailable = !product.isActive || product.stockQuantity <= 0;

  return (
    <div className={`sticky-purchase${visible ? " sticky-purchase--visible" : ""}`} aria-hidden={!visible} inert={!visible}>
      {isUnavailable ? (
        <strong className="sticky-purchase__unavailable">ناموجود</strong>
      ) : (
        <strong>{product.price}</strong>
      )}
      <AddToCartButton product={product} compact />
    </div>
  );
}
