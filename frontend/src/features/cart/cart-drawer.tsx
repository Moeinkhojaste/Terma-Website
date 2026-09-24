"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { BagIcon, GiftIcon, MinusIcon, PackageIcon, PlusIcon, TrashIcon, XIcon } from "@/components/ui/icons";
import { useCart, type CartItem } from "@/features/cart/cart-provider";
import { RemoveCartItemDialog } from "@/features/cart/remove-cart-item-dialog";
import { isUnoptimizedMedia } from "@/lib/media";

function formatToman(amount: number): string {
  return new Intl.NumberFormat("fa-IR").format(amount) + " تومان";
}

export function CartDrawer() {
  const { items, itemCount, isCartOpen, closeCart, setQuantity, removeItem, toggleItemPackaging } = useCart();
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);

  const subtotal = items.reduce((sum, item) => sum + (item.product.priceValue + item.packagingFee) * item.quantity, 0);

  return (
    <>
      <AccessibleDialog open={isCartOpen} onClose={closeCart} className="cart-drawer-dialog sheet-dialog" label="سبد خرید سریع">
        <div className="cart-drawer" aria-live="polite">
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
                <Link href="/products" className="button button--primary" onClick={closeCart}>
                  مشاهده و خرید محصولات
                </Link>
              </div>
            ) : (
              <ul className="cart-drawer__list">
                {items.map((item) => {
                  const { lineId, product, quantity, packagingType, packagingFee } = item;
                  const atLimit = quantity >= product.stockQuantity;
                  const lineTotal = (product.priceValue + packagingFee) * quantity;

                  return (
                    <li key={lineId} className="cart-drawer-item">
                      <div className="cart-drawer-item__image">
                        <Image
                          src={product.image}
                          alt={product.imageAlt || product.name}
                          fill
                          sizes="80px"
                          unoptimized={isUnoptimizedMedia(product.image)}
                        />
                      </div>
                      <div className="cart-drawer-item__content">
                        <div className="cart-drawer-item__top">
                          <h3 className="cart-drawer-item__title">{product.name}</h3>
                          <button
                            type="button"
                            className="cart-drawer-item__remove"
                            onClick={() => setItemToRemove(item)}
                            aria-label={`حذف ${product.name} از سبد`}
                            title="حذف محصول"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>

                        <p className="cart-drawer-item__spec">{product.capacity} · {product.dimensions}</p>

                        <div className="cart-drawer-item__packaging flex items-center justify-between my-1 text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium ${
                            packagingType === "GiftBox" ? "bg-teal-50 text-teal-900 border border-teal-200" : "bg-stone-100 text-stone-600"
                          }`}>
                            {packagingType === "GiftBox" ? (
                              <>
                                <GiftIcon className="size-3 text-teal-700" />
                                <span>کادویی</span>
                              </>
                            ) : (
                              <>
                                <PackageIcon className="size-3 text-stone-500" />
                                <span>معمولی</span>
                              </>
                            )}
                            {packagingFee > 0 && <span>({formatToman(packagingFee)})</span>}
                          </span>
                          <button
                            type="button"
                            className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-[11px] cursor-pointer"
                            onClick={() => toggleItemPackaging(lineId)}
                            title="تغییر نوع بسته‌بندی"
                          >
                            {packagingType === "GiftBox" ? "تبدیل به معمولی" : "تبدیل به کادویی"}
                          </button>
                        </div>

                        <div className="cart-drawer-item__bottom">
                          <div className="cart-drawer-item__quantity">
                            <button
                              type="button"
                              onClick={() =>
                                quantity === 1
                                  ? setItemToRemove(item)
                                  : setQuantity(lineId, quantity - 1)
                              }
                              aria-label="کاهش تعداد"
                            >
                              <MinusIcon />
                            </button>
                            <span>{new Intl.NumberFormat("fa-IR").format(quantity)}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(lineId, quantity + 1)}
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
        </div>
      </AccessibleDialog>

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
    </>
  );
}
