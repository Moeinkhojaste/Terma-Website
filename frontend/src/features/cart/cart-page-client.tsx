"use client";

import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { MinusIcon, PlusIcon, TrashIcon } from "@/components/ui/icons";
import { useCart } from "@/features/cart/cart-provider";
import { formatPrice } from "@/lib/format";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";

export function CartPageClient() {
  const { items, hydrated, setQuantity, removeItem } = useCart();
  const subtotal = items.reduce((total, item) => total + item.product.priceValue * item.quantity, 0);

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا" className="commerce-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><span aria-current="page">سبد خرید</span>
          </nav>
          <CheckoutProgress current={1} />
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
                {items.map(({ lineId, product, quantity }) => (
                  <article className="cart-item" key={lineId}>
                    <Link className="cart-item__image" href={`/products/${product.slug || product.id}`} aria-label={`مشاهده ${product.name}`}>
                      <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 34vw, 180px" />
                    </Link>
                    <div className="cart-item__content">
                      <div>
                        <span className="cart-item__capacity">{product.capacity}</span>
                        <h2><Link href={`/products/${product.slug || product.id}`}>{product.name}</Link></h2>
                        <p>{product.dimensions}</p>
                      </div>
                      <div className="cart-item__actions">
                        <div className="quantity-control" aria-label={`تعداد ${product.name}`}>
                          <button type="button" onClick={() => setQuantity(lineId, quantity - 1)} disabled={quantity === 1} aria-label="کاهش تعداد"><MinusIcon /></button>
                          <span aria-live="polite">{new Intl.NumberFormat("fa-IR").format(quantity)}</span>
                          <button type="button" onClick={() => setQuantity(lineId, quantity + 1)} disabled={quantity >= product.stockQuantity} aria-label="افزایش تعداد"><PlusIcon /></button>
                        </div>
                        <button className="remove-item" type="button" onClick={() => removeItem(lineId)} aria-label={`حذف ${product.name} از سبد`}><TrashIcon /> حذف</button>
                      </div>
                      {quantity >= product.stockQuantity && <p className="cart-stock-note" role="status">حداکثر تعداد قابل سفارش برای این محصول در سبد است.</p>}
                    </div>
                    <strong className="cart-item__price">{formatPrice(product.priceValue * quantity)}</strong>
                  </article>
                ))}
              </section>

              <aside className="order-summary" aria-labelledby="cart-summary-title">
                <h2 id="cart-summary-title">خلاصه سبد</h2>
                <dl>
                  <div><dt>جمع محصولات</dt><dd>{formatPrice(subtotal)}</dd></div>
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
      <Footer />
    </>
  );
}
