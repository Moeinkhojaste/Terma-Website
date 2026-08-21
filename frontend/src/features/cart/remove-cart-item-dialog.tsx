"use client";

import Image from "next/image";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { TrashIcon, XIcon } from "@/components/ui/icons";
import type { CartItem } from "@/features/cart/cart-provider";
import { formatPrice } from "@/lib/format";

export type RemoveCartItemDialogProps = {
  item: CartItem | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function RemoveCartItemDialog({ item, onClose, onConfirm }: RemoveCartItemDialogProps) {
  if (!item) return null;

  const { product, quantity } = item;
  const itemTotal = product.priceValue * quantity;

  return (
    <AccessibleDialog
      open={Boolean(item)}
      onClose={onClose}
      className="cart-remove-dialog"
      label={`تأیید حذف ${product.name} از سبد خرید`}
    >
      <div
        className="cart-remove-modal"
        role="alertdialog"
        aria-labelledby="remove-dialog-title"
        aria-describedby="remove-dialog-desc"
      >
        <button
          type="button"
          className="cart-remove-modal__close"
          onClick={onClose}
          aria-label="بستن پنجره تأیید"
        >
          <XIcon className="size-4" />
        </button>

        <div className="cart-remove-modal__header">
          <div className="cart-remove-modal__icon-badge" aria-hidden="true">
            <TrashIcon className="size-6" />
          </div>
          <h3 id="remove-dialog-title" className="cart-remove-modal__title">
            حذف محصول از سبد خرید
          </h3>
          <p id="remove-dialog-desc" className="cart-remove-modal__message">
            آیا از حذف <strong>«{product.name}»</strong> از سبد خرید خود اطمینان دارید؟
          </p>
        </div>

        <div className="cart-remove-modal__product">
          <div className="cart-remove-modal__product-image">
            <Image
              src={product.image}
              alt={product.imageAlt || product.name}
              fill
              sizes="64px"
            />
          </div>
          <div className="cart-remove-modal__product-info">
            <span className="cart-remove-modal__product-name">{product.name}</span>
            {(product.capacity || product.dimensions) && (
              <span className="cart-remove-modal__product-specs">
                {[product.capacity, product.dimensions].filter(Boolean).join(" · ")}
              </span>
            )}
            <span className="cart-remove-modal__product-qty">
              تعداد: {new Intl.NumberFormat("fa-IR").format(quantity)} عدد
              {itemTotal > 0 && ` · ${formatPrice(itemTotal)}`}
            </span>
          </div>
        </div>

        <div className="cart-remove-modal__actions">
          <button
            type="button"
            className="button button--secondary cart-remove-modal__btn-cancel"
            onClick={onClose}
            autoFocus
          >
            انصراف
          </button>
          <button
            type="button"
            className="button button--danger cart-remove-modal__btn-confirm"
            onClick={onConfirm}
          >
            بله، حذف شود
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}
