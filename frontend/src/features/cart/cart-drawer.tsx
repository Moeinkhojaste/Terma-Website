"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { BagIcon, MinusIcon, PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";

function formatToman(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

export function CartDrawer() {
  const { items, itemCount, isCartOpen, closeCart, setQuantity, removeItem } = useCart();

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) {
        closeCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCartOpen, closeCart]);

  // Lock body scroll when open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isCartOpen]);

  const subtotal = items.reduce((sum, item) => sum + item.product.priceValue * item.quantity, 0);

  if (!isCartOpen) return null;

  return (
    <div className="cart-drawer-wrapper" aria-live="polite">
      <div className="cart-drawer-backdrop" onClick={closeCart} aria-hidden="true" />
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="سبد خرید سریع"
      >
        <header className="cart-drawer__header">
          <div className="cart-drawer__title">
            <BagIcon className="size-5" />
            <h2>سبد خرید شما</h2>
            <span className="cart-drawer__count">
              ({new Intl.NumberFormat("fa-IR").format(itemCount)})
            </span>
          </div>
          <button
            type="button"
            className="cart-drawer__close"
            onClick={closeCart}
            aria-label="بستن سبد خرید"
          >
            <XIcon className="size-5" />
          </button>
        </header>

        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <div className="cart-drawer__empty-icon">
                <BagIcon className="size-8" />
              </div>
              <p>سبد خرید شما در حال حاضر خالی است.</p>
              <button
                type="button"
                className="button button--primary"
                onClick={closeCart}
              >
                مشاهده و خرید محصولات
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__list">
              {items.map(({ product, quantity }) => {
                const atLimit = quantity >= product.stockQuantity;
                const lineTotal = product.priceValue * quantity;

                return (
                  <li key={product.id} className="cart-drawer-item">
                    <div className="cart-drawer-item__image">
                      <Image
                        src={product.image}
                        alt={product.imageAlt || product.name}
                        fill
                        sizes="80px"
                      />
                    </div>
                    <div className="cart-drawer-item__content">
                      <div className="cart-drawer-item__top">
                        <h3 className="cart-drawer-item__title">{product.name}</h3>
                        <button
                          type="button"
                          className="cart-drawer-item__remove"
                          onClick={() => removeItem(product.id)}
                          aria-label={`حذف ${product.name} از سبد`}
                          title="حذف محصول"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>

                      <p className="cart-drawer-item__spec">{product.dimensions}</p>

                      <div className="cart-drawer-item__bottom">
                        <div className="cart-drawer-item__quantity">
                          <button
                            type="button"
                            onClick={() =>
                              quantity === 1
                                ? removeItem(product.id)
                                : setQuantity(product.id, quantity - 1)
                            }
                            aria-label="کاهش تعداد"
                          >
                            <MinusIcon />
                          </button>
                          <span>{new Intl.NumberFormat("fa-IR").format(quantity)}</span>
                          <button
                            type="button"
                            onClick={() => setQuantity(product.id, quantity + 1)}
                            disabled={atLimit}
                            aria-label="افزایش تعداد"
                          >
                            <PlusIcon />
                          </button>
                        </div>

                        <div className="cart-drawer-item__price">
                          {formatToman(lineTotal)}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="cart-drawer__footer">
            <div className="cart-drawer__subtotal">
              <span>جمع کل سبد خرید:</span>
              <strong>{formatToman(subtotal)}</strong>
            </div>
            <p className="cart-drawer__shipping-note">
              هزینه ارسال در مرحله تسویه حساب محاسبه خواهد شد.
            </p>

            <div className="cart-drawer__actions">
              <Link
                href="/checkout"
                className="button button--primary cart-drawer__btn-checkout"
                onClick={closeCart}
              >
                تسویه حساب و تکمیل خرید
              </Link>
              <button
                type="button"
                className="button button--secondary cart-drawer__btn-continue"
                onClick={closeCart}
              >
                ادامه خرید
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
