"use client";

import { BagIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";

export function CartLink() {
  const { itemCount, openCart } = useCart();
  const label = itemCount === 0 ? "سبد خرید، بدون محصول" : `سبد خرید، ${itemCount} محصول`;

  return (
    <button
      type="button"
      className={`icon-button cart-button ${itemCount > 0 ? "cart-button--has-items" : ""}`}
      onClick={openCart}
      aria-label={label}
    >
      <BagIcon className="size-5 cart-button__icon" />
      <span className="cart-button__badge" aria-hidden="true">{new Intl.NumberFormat("fa-IR").format(itemCount)}</span>
    </button>
  );
}
