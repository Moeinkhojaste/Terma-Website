"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/features/cart/cart-provider";
import type { Product } from "@/features/products/models";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const quantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const unavailable = !product.isActive || product.stockQuantity === 0;
  const atLimit = !unavailable && quantity >= product.stockQuantity;

  return (
    <div className="add-to-cart">
      <button
        className="button button--primary product-order-button"
        type="button"
        disabled={unavailable || atLimit}
        onClick={() => {
          addItem(product);
          setAdded(true);
        }}
      >
        {unavailable ? "این محصول ناموجود است" : atLimit ? "حداکثر موجودی در سبد است" : added ? "دوباره اضافه کن" : "افزودن به سبد خرید"}
      </button>
      <div className="add-to-cart__feedback" aria-live="polite">
        {added && !atLimit && <><span>محصول به سبد اضافه شد.</span><Link href="/cart">مشاهده سبد</Link></>}
        {atLimit && <span>تعداد بیشتری از این محصول قابل سفارش نیست.</span>}
      </div>
    </div>
  );
}
