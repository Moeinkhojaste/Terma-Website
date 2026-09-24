"use client";

import { useState } from "react";
import { BagIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useCart, type CartItem, type PackagingType } from "@/features/cart/cart-provider";
import { RemoveCartItemDialog } from "@/features/cart/remove-cart-item-dialog";
import type { Product } from "@/features/products/models";

export function AddToCartButton({
  product,
  packagingType = "Standard",
  packagingFee = 0,
  compact = false,
  onOpenCart,
}: {
  product: Product;
  packagingType?: PackagingType;
  packagingFee?: number;
  compact?: boolean;
  onOpenCart?: () => void;
}) {
  const { addItem, items, removeItem, setQuantity, openCart, getLineId } = useCart();
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);
  const lineId = getLineId(product, packagingType);
  const quantity = items.find((item) => item.lineId === lineId)?.quantity ?? 0;
  const unavailable = !product.isActive || product.stockQuantity === 0;
  const atLimit = !unavailable && quantity >= product.stockQuantity;

  return (
    <div className={`add-to-cart-container${compact ? " add-to-cart-container--compact" : ""}`}>
      {quantity > 0 ? (
        <div className="add-to-cart-active">
          <div className="product-order-quantity" role="group" aria-label={`تعداد ${product.name} در سبد خرید`}>
            <button
              type="button"
              onClick={() => {
                if (quantity === 1) {
                  setItemToRemove({ lineId, product, quantity: 1, productId: product.id, packagingType, packagingFee });
                } else {
                  setQuantity(lineId, quantity - 1);
                }
              }}
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
              onClick={() => setQuantity(lineId, quantity + 1)}
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
            onClick={() => { onOpenCart?.(); openCart(); }}
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
          onClick={() => { onOpenCart?.(); addItem(product, packagingType, packagingFee); }}
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

      <RemoveCartItemDialog
        item={itemToRemove}
        onClose={() => setItemToRemove(null)}
        onConfirm={() => {
          if (itemToRemove) {
            removeItem(itemToRemove.lineId);
            setItemToRemove(null);
          }
        }}
      />
    </div>
  );
}
