"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/cart-provider";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { formatPrice } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";
import { createOrder, getQuote } from "@/features/checkout/checkout-api";
import { getCustomerSession } from "@/features/account/account-api";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";

type FieldName = "fullName" | "mobile" | "province" | "city" | "address" | "postalCode";
type FormErrors = Partial<Record<FieldName, string>>;
type RequestState = "idle" | "submitting" | "network-error" | "server-error";

const fieldLabels: Record<FieldName, string> = {
  fullName: "نام و نام خانوادگی",
  mobile: "شماره موبایل",
  province: "استان",
  city: "شهر",
  address: "آدرس کامل",
  postalCode: "کد پستی",
};

function validateField(name: FieldName, value: string) {
  const clean = value.trim();
  if (name === "fullName" && !clean) return "نام و نام خانوادگی را وارد کنید.";
  if (name === "fullName" && clean.length < 3) return "نام و نام خانوادگی را کامل وارد کنید.";
  if (name === "mobile" && !clean) return "شماره موبایل را وارد کنید.";
  if (name === "mobile" && !normalizeIranianMobile(clean)) return "شماره را مانند ۰۹۱۲...، +۹۸۹۱۲... یا ۰۰۹۸۹۱۲... وارد کنید.";
  if ((name === "province" || name === "city") && !clean) return `${fieldLabels[name]} را وارد کنید.`;
  if ((name === "province" || name === "city") && clean.length < 2) return `${fieldLabels[name]} را وارد کنید.`;
  if (name === "address" && !clean) return "آدرس کامل را وارد کنید.";
  if (name === "address" && clean.length < 10) return "آدرس را با جزئیات بیشتری وارد کنید.";
  if (name === "postalCode" && !clean) return "کد پستی را وارد کنید.";
  if (name === "postalCode" && !/^\d{10}$/.test(normalizeNumericText(clean))) return "کد پستی باید ۱۰ رقم باشد.";
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

export function CheckoutPageClient() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const { items, hydrated, clearCart } = useCart();
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [serverError, setServerError] = useState("");
  const [mobile, setMobile] = useState("");
  const [verifiedMobile, setVerifiedMobile] = useState(false);
  useEffect(() => { getCustomerSession().then(session => { setMobile(session.phone); setVerifiedMobile(true); }).catch(() => undefined); }, []);
  
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = items.reduce((total, item) => total + item.product.priceValue * item.quantity, 0);

  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.currentTarget.name as FieldName;
    if (!(name in fieldLabels)) return;
    const error = validateField(name, event.currentTarget.value);
    setErrors((current) => ({ ...current, [name]: error || undefined }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const name = event.currentTarget.name as FieldName;
    if (!(name in fieldLabels)) return;
    const error = validateField(name, event.currentTarget.value);
    setErrors((current) => ({ ...current, [name]: error || undefined }));
    setRequestState("idle");
    setServerError("");
  }

  async function handleApplyCoupon(e: FormEvent) {
    e.preventDefault();
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponMessage(null);
    try {
      const quote = await getQuote({
        items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        couponCode: code,
      });
      if (quote.discountTotal > 0) {
        setAppliedCoupon(code.toUpperCase());
        setDiscountTotal(quote.discountTotal);
        setCouponMessage({ type: "success", text: `کد تخفیف ${code.toUpperCase()} با موفقیت اعمال شد.` });
      } else {
        setAppliedCoupon(null);
        setDiscountTotal(0);
        setCouponMessage({ type: "error", text: "کد تخفیف واردشده معتبر نیست یا منقضی شده است." });
      }
    } catch {
      setAppliedCoupon(null);
      setDiscountTotal(0);
      setCouponMessage({ type: "error", text: "خطا در بررسی کد تخفیف. دوباره تلاش کنید." });
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setCouponInput("");
    setAppliedCoupon(null);
    setDiscountTotal(0);
    setCouponMessage(null);
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
    setServerError("");
    if (!window.navigator.onLine) { setRequestState("network-error"); return; }
    const form = new FormData(event.currentTarget);
    try {
      const order = await createOrder({
        items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
        fullName: String(form.get("fullName") ?? "").trim(), phone: normalizeIranianMobile(String(form.get("mobile") ?? ""))!,
        province: String(form.get("province") ?? "").trim(), city: String(form.get("city") ?? "").trim(), address: String(form.get("address") ?? "").trim(), postalCode: normalizeNumericText(String(form.get("postalCode") ?? "")),
        customerNotes: String(form.get("customerNotes") ?? "").trim() || undefined,
        couponCode: appliedCoupon ?? undefined,
      });
      clearCart();
      router.replace(`/order/success?order=${encodeURIComponent(order.number)}&tracking=${encodeURIComponent(order.trackingToken)}`);
    } catch (caught) {
      if (caught instanceof ApiError && caught.isNetworkError) setRequestState("network-error");
      else {
        setServerError(getCheckoutErrorMessage(caught));
        setRequestState("server-error");
      }
    }
  }

  const field = (name: FieldName) => ({
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    onBlur: handleBlur,
    onChange: handleChange,
  });

  const fieldError = (name: FieldName) => errors[name]
    ? <small id={`${name}-error`} className="form-field__error" role="alert">{errors[name]}</small>
    : null;

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا" className="commerce-page checkout-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><Link href="/cart">سبد خرید</Link><span>/</span><span aria-current="page">تکمیل سفارش</span>
          </nav>
          <CheckoutProgress current={2} />
          <div className="commerce-heading">
            <p className="section-eyebrow">اطلاعات ارسال</p>
            <h1>تکمیل سفارش</h1>
            <p>اطلاعات گیرنده را وارد کنید. فیلدهای ستاره‌دار الزامی هستند.</p>
          </div>

          {!hydrated ? (
            <div className="cart-loading" role="status">در حال آماده‌کردن سفارش…</div>
          ) : items.length === 0 ? (
            <><section className="commerce-empty">
              <h2>محصولی برای تکمیل سفارش وجود ندارد</h2>
              <p>ابتدا یک محصول به سبد خرید اضافه کنید.</p>
              <Link className="button button--primary" href="/products">مشاهده محصولات</Link>
            </section><RecentlyViewedProducts title="محصولات پیشنهادی برای شروع" compact /></>
          ) : (
            <div className="checkout-layout">
              <form ref={formRef} className="checkout-form" onSubmit={handleSubmit} noValidate aria-busy={requestState === "submitting"}>
                {Object.values(errors).some(Boolean) && (
                  <div className="checkout-form-errors" role="alert"><strong>لطفاً خطاهای مشخص‌شده در فرم را اصلاح کنید.</strong></div>
                )}
                <section className="checkout-panel" aria-labelledby="receiver-title">
                  <div className="checkout-panel__heading"><span>۱</span><div><h2 id="receiver-title">اطلاعات گیرنده</h2><p>نام و شماره تماس فرد تحویل‌گیرنده</p></div></div>
                  <div className="form-grid">
                    <label className="form-field"><span>نام و نام خانوادگی *</span><input name="fullName" autoComplete="name" {...field("fullName")} />{fieldError("fullName")}</label>
                    <label className="form-field"><span>شماره موبایل *</span><input name="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲... یا +۹۸۹۱۲..." value={mobile} readOnly={verifiedMobile} aria-readonly={verifiedMobile} {...field("mobile")} onChange={event => { setMobile(event.target.value); handleChange(event); }} />{fieldError("mobile")}{verifiedMobile && <small>این شماره قبلاً تأیید شده است.</small>}</label>
                  </div>
                </section>

                <section className="checkout-panel" aria-labelledby="address-title">
                  <div className="checkout-panel__heading"><span>۲</span><div><h2 id="address-title">آدرس ارسال</h2><p>نشانی دقیق محل تحویل سفارش</p></div></div>
                  <div className="form-grid">
                    <label className="form-field"><span>استان *</span><input name="province" autoComplete="address-level1" {...field("province")} />{fieldError("province")}</label>
                    <label className="form-field"><span>شهر *</span><input name="city" autoComplete="address-level2" {...field("city")} />{fieldError("city")}</label>
                    <label className="form-field form-field--full"><span>آدرس کامل *</span><textarea name="address" rows={4} autoComplete="street-address" {...field("address")} />{fieldError("address")}</label>
                    <label className="form-field"><span>کد پستی *</span><input name="postalCode" inputMode="numeric" autoComplete="postal-code" {...field("postalCode")} />{fieldError("postalCode")}</label>
                    <label className="form-field form-field--full"><span>توضیحات سفارش (اختیاری)</span><textarea name="customerNotes" rows={3} placeholder="نکته یا درخواستی درباره این سفارش دارید، بنویسید..." /></label>
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
                {requestState === "server-error" && (
                  <div className="network-error" role="alert"><div><strong>ثبت سفارش انجام نشد.</strong><p>{serverError}</p></div><button type="button" onClick={() => formRef.current?.requestSubmit()}>تلاش دوباره</button></div>
                )}
                <button className="button button--primary checkout-submit" type="submit" disabled={requestState === "submitting"}>
                  {requestState === "submitting" && <span className="button-spinner" aria-hidden="true" />}
                  {requestState === "submitting" ? "در حال ارسال درخواست…" : "ثبت سفارش"}
                </button>
                <p className="checkout-test-note">این نسخه به درگاه بانکی واقعی متصل نیست.</p>
              </form>

              <aside className="order-summary checkout-summary" aria-labelledby="checkout-summary-title">
                <div className="checkout-summary__heading"><h2 id="checkout-summary-title">سفارش شما</h2><Link href="/cart">ویرایش سبد</Link></div>
                <div className="checkout-products">
                  {items.map(({ lineId, product, quantity }) => (
                    <div className="checkout-product" key={lineId}>
                      <div className="checkout-product__image"><Image src={product.image} alt="" fill sizes="72px" /></div>
                      <div><strong>{product.name}</strong><span>{product.capacity} · تعداد {new Intl.NumberFormat("fa-IR").format(quantity)}</span></div>
                      <b>{formatPrice(product.priceValue * quantity)}</b>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "1.25rem", padding: "1rem 0", borderTop: "1px solid var(--line)" }}>
                  <form onSubmit={handleApplyCoupon} style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="کد تخفیف (مثلاً OFF20)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      disabled={Boolean(appliedCoupon) || couponLoading}
                      dir="ltr"
                      style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)", font: "inherit", textTransform: "uppercase" }}
                    />
                    {appliedCoupon ? (
                      <button type="button" className="button button--secondary" onClick={handleRemoveCoupon}>
                        حذف
                      </button>
                    ) : (
                      <button type="submit" className="button button--primary" disabled={couponLoading || !couponInput.trim()}>
                        {couponLoading ? "بررسی…" : "اعمال"}
                      </button>
                    )}
                  </form>
                  {couponMessage && (
                    <p style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: couponMessage.type === "success" ? "var(--teal-deep)" : "var(--danger)" }}>
                      {couponMessage.text}
                    </p>
                  )}
                </div>

                <dl>
                  <div><dt>جمع محصولات</dt><dd>{formatPrice(subtotal)}</dd></div>
                  {discountTotal > 0 && (
                    <div><dt style={{ color: "var(--teal-deep)" }}>تخفیف کد ({appliedCoupon})</dt><dd style={{ color: "var(--teal-deep)", fontWeight: 700 }}>{formatPrice(discountTotal)}-</dd></div>
                  )}
                  <div><dt>هزینه ارسال</dt><dd>پس از بررسی آدرس</dd></div>
                </dl>
                <div className="order-summary__total"><span>مبلغ نهایی</span><strong>{formatPrice(Math.max(0, subtotal - discountTotal))}</strong></div>
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

function getCheckoutErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.";
  if (error.isNetworkError) return "ارتباط با سرویس برقرار نشد. اتصال اینترنت و اجرای API را بررسی کنید.";
  if (error.status === 409) return "شماره موبایل سفارش باید با شماره تأییدشده حساب شما یکسان باشد.";
  const detail = `${error.problem?.detail ?? ""} ${error.message}`.toLowerCase();
  if (detail.includes("available") || detail.includes("inventory") || detail.includes("stock")) {
    return "موجودی یکی از محصولات کافی نیست. سبد خرید را بررسی کنید.";
  }
  if (error.status === 400) return "اطلاعات سفارش معتبر نیست. موارد مشخص‌شده را بررسی کنید.";
  return "سرویس ثبت سفارش پاسخ مناسبی نداد. چند لحظه دیگر دوباره تلاش کنید.";
}
