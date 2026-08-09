"use client";

import Link from "next/link";
import { MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";
import type { Product } from "@/features/products/models";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items, removeItem, setQuantity } = useCart();
  const quantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const unavailable = !product.isActive || product.stockQuantity === 0;
  const atLimit = !unavailable && quantity >= product.stockQuantity;

  return (
    <div className="add-to-cart">
      {quantity > 0 ? (
        <div className="product-order-quantity" role="group" aria-label={`تعداد ${product.name} در سبد خرید`}>
          <button
            type="button"
            onClick={() => quantity === 1 ? removeItem(product.id) : setQuantity(product.id, quantity - 1)}
            aria-label={quantity === 1 ? "حذف از سبد خرید" : "کاهش تعداد"}
          >
            <MinusIcon />
          </button>
          <span aria-live="polite">
            <strong>{new Intl.NumberFormat("fa-IR").format(quantity)}</strong>
            <small>در سبد خرید</small>
          </span>
          <button
            type="button"
            onClick={() => setQuantity(product.id, quantity + 1)}
            disabled={atLimit}
            aria-label="افزایش تعداد"
          >
            <PlusIcon />
          </button>
        </div>
      ) : (
        <button
          className="button button--primary product-order-button"
          type="button"
          disabled={unavailable}
          onClick={() => addItem(product)}
        >
          {unavailable ? "این محصول ناموجود است" : "افزودن به سبد خرید"}
        </button>
      )}
      <div className="add-to-cart__feedback" aria-live="polite">
        {quantity > 0 && !atLimit && <><span>تعداد موردنظر را انتخاب کنید.</span><Link href="/cart">مشاهده سبد</Link></>}
        {atLimit && <span>تعداد بیشتری از این محصول قابل سفارش نیست.</span>}
      </div>
    </div>
  );
}
