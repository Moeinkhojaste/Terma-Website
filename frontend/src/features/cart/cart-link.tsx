"use client";

import { BagIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";

export function CartLink() {
  const { itemCount, openCart } = useCart();
  const label = itemCount === 0 ? "سبد خرید، بدون محصول" : `سبد خرید، ${itemCount} محصول`;

  return (
    <button
      type="button"
      className="icon-button cart-button"
      onClick={openCart}
      aria-label={label}
    >
      <BagIcon />
      <span aria-hidden="true">{new Intl.NumberFormat("fa-IR").format(itemCount)}</span>
    </button>
  );
}
