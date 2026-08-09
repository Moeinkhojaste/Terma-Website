"use client";

import Link from "next/link";
import { BagIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";

export function CartLink() {
  const { itemCount } = useCart();
  const label = itemCount === 0 ? "سبد خرید، بدون محصول" : `سبد خرید، ${itemCount} محصول`;

  return (
    <Link className="icon-button cart-button" href="/cart" aria-label={label}>
      <BagIcon />
      <span aria-hidden="true">{new Intl.NumberFormat("fa-IR").format(itemCount)}</span>
    </Link>
  );
}
