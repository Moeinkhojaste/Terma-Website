"use client";

import { BagIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";
import type { Product } from "@/features/products/models";

export function AddToCartButton({ product }: { product: Product }) {
  const { addItem, items, removeItem, setQuantity, openCart } = useCart();
  const quantity = items.find((item) => item.product.id === product.id)?.quantity ?? 0;
  const unavailable = !product.isActive || product.stockQuantity === 0;
  const atLimit = !unavailable && quantity >= product.stockQuantity;

  return (
    <div className="add-to-cart-container">
      {quantity > 0 ? (
        <div className="add-to-cart-active">
          <div className="product-order-quantity" role="group" aria-label={`تعداد ${product.name} در سبد خرید`}>
            <button
              type="button"
              onClick={() => (quantity === 1 ? removeItem(product.id) : setQuantity(product.id, quantity - 1))}
              aria-label={quantity === 1 ? "حذف از سبد خرید" : "کاهش تعداد"}
              title={quantity === 1 ? "حذف از سبد" : "کاهش"}
            >
              <MinusIcon />
            </button>
            <span aria-live="polite" className="quantity-display">
              <strong>{new Intl.NumberFormat("fa-IR").format(quantity)}</strong>
              <small>در سبد</small>
            </span>
            <button
              type="button"
              onClick={() => setQuantity(product.id, quantity + 1)}
              disabled={atLimit}
              aria-label="افزایش تعداد"
              title={atLimit ? "سقف موجودی" : "افزایش"}
            >
              <PlusIcon />
            </button>
          </div>

          <button
            type="button"
            className="button button--primary add-to-cart__view-btn"
            onClick={openCart}
          >
            <BagIcon className="size-5" />
            <span>مشاهده سبد خرید</span>
          </button>
        </div>
      ) : (
        <button
          className="button button--primary product-order-button"
          type="button"
          disabled={unavailable}
          onClick={() => addItem(product)}
        >
          <BagIcon className="size-5" />
          <span>{unavailable ? "این محصول ناموجود است" : "افزودن به سبد خرید"}</span>
        </button>
      )}

      {atLimit && quantity > 0 && (
        <div className="add-to-cart__limit-notice" aria-live="polite">
          تعداد بیشتری از این محصول قابل سفارش نیست.
        </div>
      )}
    </div>
  );
}
