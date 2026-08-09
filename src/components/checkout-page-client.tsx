"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FocusEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart-provider";
import { Container } from "@/components/container";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { products } from "@/data/products";
import { formatPrice } from "@/lib/format";

type FieldName = "fullName" | "mobile" | "email" | "province" | "city" | "address" | "postalCode";
type FormErrors = Partial<Record<FieldName, string>>;
type RequestState = "idle" | "submitting" | "network-error";

const fieldLabels: Record<FieldName, string> = {
  fullName: "نام و نام خانوادگی",
  mobile: "شماره موبایل",
  email: "ایمیل",
  province: "استان",
  city: "شهر",
  address: "آدرس کامل",
  postalCode: "کد پستی",
};

function validateField(name: FieldName, value: string) {
  const clean = value.trim();
  if (name === "fullName" && clean.length < 3) return "نام و نام خانوادگی را کامل وارد کنید.";
  if (name === "mobile" && !/^[0-9۰-۹]{11}$/.test(clean)) return "شماره موبایل باید ۱۱ رقم باشد.";
  if (name === "email" && clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "ایمیل واردشده معتبر نیست.";
  if ((name === "province" || name === "city") && clean.length < 2) return `${fieldLabels[name]} را وارد کنید.`;
  if (name === "address" && clean.length < 10) return "آدرس را با جزئیات بیشتری وارد کنید.";
  if (name === "postalCode" && !/^[0-9۰-۹]{10}$/.test(clean)) return "کد پستی باید ۱۰ رقم باشد.";
  return "";
}

function validateForm(formData: FormData) {
  const errors: FormErrors = {};
  (Object.keys(fieldLabels) as FieldName[]).forEach((name) => {
    const error = validateField(name, String(formData.get(name) ?? ""));
    if (error) errors[name] = error;
  });
  return errors;
}

export function CheckoutPageClient({ simulation }: { simulation?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { items, hydrated, clearCart } = useCart();
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const detailedItems = items.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const subtotal = detailedItems.reduce((total, item) => total + item.product.priceValue * item.quantity, 0);

  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.currentTarget.name as FieldName;
    if (!(name in fieldLabels)) return;
    const error = validateField(name, event.currentTarget.value);
    setErrors((current) => ({ ...current, [name]: error || undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formErrors = validateForm(new FormData(event.currentTarget));
    setErrors(formErrors);
    const firstError = (Object.keys(fieldLabels) as FieldName[]).find((name) => formErrors[name]);
    if (firstError) {
      (event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus();
      return;
    }

    setRequestState("submitting");
    await new Promise((resolve) => window.setTimeout(resolve, 1100));

    if (!window.navigator.onLine) {
      setRequestState("network-error");
      return;
    }

    if (simulation === "failed") {
      router.push("/order/failed");
      return;
    }
    if (simulation === "cancelled") {
      router.push("/order/cancelled");
      return;
    }

    const orderNumber = `TRM-${String(Date.now()).slice(-8)}`;
    clearCart();
    router.replace(`/order/success?order=${orderNumber}`);
  }

  const field = (name: FieldName) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onBlur: handleBlur,
  });

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا" className="commerce-page checkout-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><Link href="/cart">سبد خرید</Link><span>/</span><span aria-current="page">تکمیل سفارش</span>
          </nav>
          <div className="commerce-heading">
            <p className="section-eyebrow">اطلاعات ارسال</p>
            <h1>تکمیل سفارش</h1>
            <p>اطلاعات گیرنده را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
          </div>

          {!hydrated ? (
            <div className="cart-loading" role="status">در حال آماده‌کردن سفارش…</div>
          ) : detailedItems.length === 0 ? (
            <section className="commerce-empty">
              <h2>محصولی برای تکمیل سفارش وجود ندارد</h2>
              <p>ابتدا یک محصول به سبد خرید اضافه کنید.</p>
              <Link className="button button--primary" href="/products">مشاهده محصولات</Link>
            </section>
          ) : (
            <div className="checkout-layout">
              <form ref={formRef} className="checkout-form" onSubmit={handleSubmit} noValidate aria-busy={requestState === "submitting"}>
                {Object.values(errors).some(Boolean) && (
                  <div className="checkout-form-errors" role="alert"><strong>لطفاً خطاهای مشخص‌شده در فرم را اصلاح کنید.</strong></div>
                )}
                <section className="checkout-panel" aria-labelledby="receiver-title">
                  <div className="checkout-panel__heading"><span>۱</span><div><h2 id="receiver-title">اطلاعات گیرنده</h2><p>نام و شماره تماس فرد تحویل‌گیرنده</p></div></div>
                  <div className="form-grid">
                    <label className="form-field"><span>نام و نام خانوادگی *</span><input name="fullName" autoComplete="name" {...field("fullName")} />{errors.fullName && <small className="form-error" id="fullName-error">{errors.fullName}</small>}</label>
                    <label className="form-field"><span>شماره موبایل *</span><input name="mobile" type="tel" inputMode="numeric" autoComplete="tel" placeholder="مثال: ۰۹۱۲۱۲۳۴۵۶۷" {...field("mobile")} />{errors.mobile && <small className="form-error" id="mobile-error">{errors.mobile}</small>}</label>
                    <label className="form-field"><span>ایمیل <small>اختیاری</small></span><input name="email" type="email" autoComplete="email" {...field("email")} />{errors.email && <small className="form-error" id="email-error">{errors.email}</small>}</label>
                  </div>
                </section>

                <section className="checkout-panel" aria-labelledby="address-title">
                  <div className="checkout-panel__heading"><span>۲</span><div><h2 id="address-title">آدرس ارسال</h2><p>نشانی دقیق محل تحویل سفارش</p></div></div>
                  <div className="form-grid">
                    <label className="form-field"><span>استان *</span><input name="province" autoComplete="address-level1" {...field("province")} />{errors.province && <small className="form-error" id="province-error">{errors.province}</small>}</label>
                    <label className="form-field"><span>شهر *</span><input name="city" autoComplete="address-level2" {...field("city")} />{errors.city && <small className="form-error" id="city-error">{errors.city}</small>}</label>
                    <label className="form-field form-field--full"><span>آدرس کامل *</span><textarea name="address" rows={4} autoComplete="street-address" {...field("address")} />{errors.address && <small className="form-error" id="address-error">{errors.address}</small>}</label>
                    <label className="form-field"><span>کد پستی *</span><input name="postalCode" inputMode="numeric" autoComplete="postal-code" {...field("postalCode")} />{errors.postalCode && <small className="form-error" id="postalCode-error">{errors.postalCode}</small>}</label>
                    <label className="form-field"><span>توضیحات سفارش <small>اختیاری</small></span><input name="notes" /></label>
                  </div>
                </section>

                <section className="checkout-panel" aria-labelledby="shipping-title">
                  <div className="checkout-panel__heading"><span>۳</span><div><h2 id="shipping-title">روش ارسال</h2><p>هزینه و زمان ارسال پس از بررسی آدرس اعلام می‌شود.</p></div></div>
                  <label className="shipping-option"><input type="radio" name="shipping" defaultChecked /><span><strong>ارسال پس از هماهنگی</strong><small>هماهنگی هزینه و زمان تحویل با شما</small></span></label>
                </section>

                {requestState === "network-error" && (
                  <div className="network-error" role="alert">
                    <div><strong>ارتباط با شبکه برقرار نشد.</strong><p>اتصال اینترنت را بررسی کنید. اطلاعات فرم شما حفظ شده است.</p></div>
                    <button type="button" onClick={() => formRef.current?.requestSubmit()}>تلاش مجدد</button>
                  </div>
                )}
                <button className="button button--primary checkout-submit" type="submit" disabled={requestState === "submitting"}>
                  {requestState === "submitting" && <span className="button-spinner" aria-hidden="true" />}
                  {requestState === "submitting" ? "در حال ارسال درخواست…" : "ثبت آزمایشی سفارش"}
                </button>
                <p className="checkout-test-note">این نسخه به درگاه بانکی واقعی متصل نیست.</p>
              </form>

              <aside className="order-summary checkout-summary" aria-labelledby="checkout-summary-title">
                <div className="checkout-summary__heading"><h2 id="checkout-summary-title">سفارش شما</h2><Link href="/cart">ویرایش سبد</Link></div>
                <div className="checkout-products">
                  {detailedItems.map(({ product, quantity }) => (
                    <div className="checkout-product" key={product.id}>
                      <div className="checkout-product__image"><Image src={product.image} alt="" fill sizes="72px" /></div>
                      <div><strong>{product.name}</strong><span>{product.capacity} · تعداد {new Intl.NumberFormat("fa-IR").format(quantity)}</span></div>
                      <b>{formatPrice(product.priceValue * quantity)}</b>
                    </div>
                  ))}
                </div>
                <dl><div><dt>جمع محصولات</dt><dd>{formatPrice(subtotal)}</dd></div><div><dt>هزینه ارسال</dt><dd>پس از بررسی آدرس</dd></div></dl>
                <div className="order-summary__total"><span>مبلغ فعلی</span><strong>{formatPrice(subtotal)}</strong></div>
                <p>در این مرحله هیچ مبلغی از شما دریافت نمی‌شود.</p>
              </aside>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
