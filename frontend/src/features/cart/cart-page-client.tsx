"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { GiftIcon, MinusIcon, PackageIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { useCart, type CartItem } from "@/features/cart/cart-provider";
import { RemoveCartItemDialog } from "@/features/cart/remove-cart-item-dialog";
import { formatPrice } from "@/lib/format";
import { isUnoptimizedMedia } from "@/lib/media";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";

export function CartPageClient() {
  const { items, hydrated, setQuantity, removeItem, toggleItemPackaging, revalidateCart } = useCart();
  const [itemToRemove, setItemToRemove] = useState<CartItem | null>(null);

  useEffect(() => {
    if (hydrated) {
      void revalidateCart?.();
    }
  }, [hydrated, revalidateCart]);
  const productSubtotal = items.reduce((total, item) => total + item.product.priceValue * item.quantity, 0);
  const packagingTotal = items.reduce((total, item) => total + item.packagingFee * item.quantity, 0);
  const subtotal = productSubtotal + packagingTotal;

  return (
    <>
      <main id="محتوا" className="commerce-page cart-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><span aria-current="page">سبد خرید</span>
          </nav>
          <CheckoutProgress current={2} />
          <div className="commerce-heading">
            <p className="section-eyebrow">انتخاب‌های شما</p>
            <h1>سبد خرید</h1>
            <p>تعداد محصولات را بررسی کنید و سپس اطلاعات ارسال را وارد کنید.</p>
          </div>

          {!hydrated ? (
            <div className="cart-loading" role="status">در حال آماده‌کردن سبد خرید…</div>
          ) : items.length === 0 ? (
            <><section className="commerce-empty">
              <span className="commerce-empty__icon"><TrashIcon className="size-7" /></span>
              <h2>سبد خرید شما خالی است</h2>
              <p>محصول موردنظر را انتخاب کنید و از صفحه محصول به سبد اضافه کنید.</p>
              <Link className="button button--primary" href="/products">مشاهده محصولات</Link>
            </section><RecentlyViewedProducts title="برای شروع خرید این محصولات را ببینید" compact /></>
          ) : (
            <div className="cart-layout">
              <section className="cart-items" aria-label="محصولات سبد خرید">
                {items.map((item) => {
                  const { lineId, product, quantity, packagingType, packagingFee } = item;
                  const lineTotal = (product.priceValue + packagingFee) * quantity;
                  return (
                    <article className="cart-item" key={lineId}>
                      <Link className="cart-item__image" href={`/products/${product.slug || product.id}`} aria-label={`مشاهده ${product.name}`}>
                        <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 34vw, 180px" unoptimized={isUnoptimizedMedia(product.image)} />
                      </Link>
                      <div className="cart-item__content">
                        <div>
                          <span className="cart-item__capacity">{product.capacity}</span>
                          <h2><Link href={`/products/${product.slug || product.id}`}>{product.name}</Link></h2>
                          <p>{product.dimensions}</p>
                        </div>
                        <div className="cart-item__packaging flex items-center gap-3 my-2 text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-medium ${
                            packagingType === "GiftBox" ? "bg-teal-50 text-teal-900 border border-teal-200" : "bg-stone-100 text-stone-700"
                          }`}>
                            {packagingType === "GiftBox" ? (
                              <>
                                <GiftIcon className="size-3.5 text-teal-700" />
                                <span>بسته‌بندی کادویی (جعبه)</span>
                              </>
                            ) : (
                              <>
                                <PackageIcon className="size-3.5 text-stone-500" />
                                <span>بسته‌بندی معمولی</span>
                              </>
                            )}
                            {packagingFee > 0 && <span>({formatPrice(packagingFee)})</span>}
                          </span>
                          <button
                            type="button"
                            className="text-teal-700 hover:text-teal-900 underline underline-offset-2 text-xs cursor-pointer"
                            onClick={() => toggleItemPackaging(lineId)}
                            title="تغییر نوع بسته‌بندی این کالا"
                          >
                            {packagingType === "GiftBox" ? "تغییر به بسته‌بندی معمولی" : "تغییر به بسته‌بندی کادویی"}
                          </button>
                        </div>
                        <div className="cart-item__actions">
                          <div className="quantity-control" aria-label={`تعداد ${product.name}`}>
                            <button
                              type="button"
                              onClick={() => (quantity === 1 ? setItemToRemove(item) : setQuantity(lineId, quantity - 1))}
                              aria-label="کاهش تعداد"
                            >
                              <MinusIcon />
                            </button>
                            <span aria-live="polite">{new Intl.NumberFormat("fa-IR").format(quantity)}</span>
                            <button
                              type="button"
                              onClick={() => setQuantity(lineId, quantity + 1)}
                              disabled={quantity >= product.stockQuantity}
                              aria-label="افزایش تعداد"
                            >
                              <PlusIcon />
                            </button>
                          </div>
                          <button
                            className="remove-item"
                            type="button"
                            onClick={() => setItemToRemove(item)}
                            aria-label={`حذف ${product.name} از سبد`}
                          >
                            <TrashIcon /> حذف
                          </button>
                        </div>
                        {quantity >= product.stockQuantity && <p className="cart-stock-note" role="status">حداکثر تعداد قابل سفارش برای این محصول در سبد است.</p>}
                      </div>
                      <strong className="cart-item__price">{formatPrice(lineTotal)}</strong>
                    </article>
                  );
                })}
              </section>

              <aside className="order-summary" aria-labelledby="cart-summary-title">
                <h2 id="cart-summary-title">خلاصه سبد</h2>
                <dl>
                  <div><dt>قیمت اقلام</dt><dd>{formatPrice(productSubtotal)}</dd></div>
                  {packagingTotal > 0 && (
                    <div><dt>هزینه بسته‌بندی کادویی</dt><dd className="text-amber-800 font-semibold">{formatPrice(packagingTotal)}</dd></div>
                  )}
                  <div><dt>هزینه ارسال</dt><dd>پس از واردکردن آدرس</dd></div>
                </dl>
                <div className="order-summary__total"><span>مبلغ فعلی</span><strong>{formatPrice(subtotal)}</strong></div>
                <Link className="button button--primary order-summary__button" href="/checkout">ادامه و تکمیل سفارش</Link>
                <Link className="continue-shopping" href="/products">ادامه خرید</Link>
                <p>هزینه نهایی ارسال پیش از ثبت سفارش مشخص خواهد شد.</p>
              </aside>
            </div>
          )}
        </Container>
      </main>

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
