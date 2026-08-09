"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { getProduct } from "@/data/products";

export function AddToCartButton({ productId }: { productId: string }) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  const product = getProduct(productId);
  const quantity = items.find((item) => item.productId === productId)?.quantity ?? 0;
  const unavailable = !product || product.stockQuantity === 0;
  const atLimit = !unavailable && quantity >= product.stockQuantity;

  return (
    <div className="add-to-cart">
      <button
        className="button button--primary product-order-button"
        type="button"
        disabled={unavailable || atLimit}
        onClick={() => {
          addItem(productId);
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
