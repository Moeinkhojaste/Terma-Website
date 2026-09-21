"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FocusEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/features/cart/cart-provider";
import { Container } from "@/components/layout/container";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { formatPrice } from "@/lib/format";
import { ApiError, sanitizeErrorMessage } from "@/lib/api-client";
import { MapPinIcon, UserIcon, TruckIcon, AlertTriangleIcon, XIcon, CreditCardIcon, OnlinePaymentIcon, SnappPayLogo } from "@/components/ui/icons";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";
import { createOrder, getQuote, initiatePayment, type CheckoutRequest } from "@/features/checkout/checkout-api";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";
import { IRAN_PROVINCES, getIranCities } from "@/lib/iran-locations";
import { getCustomerSession, getCustomerProfile, getCustomerAddresses, logoutCustomer, type CustomerAddress } from "@/features/account/account-api";

type FieldName = "fullName" | "mobile" | "email" | "province" | "city" | "address" | "postalCode";
type FormErrors = Partial<Record<FieldName, string>>;
type RequestState = "idle" | "submitting" | "network-error" | "server-error";
export type CheckoutReviewSnapshot = {
  request: CheckoutRequest;
  products: Array<{ lineId: string; name: string; capacity: string; image: string; quantity: number; lineTotal: number }>;
  subtotal: number;
  discountTotal: number;
  total: number;
  paymentMethod?: "online" | "snapppay";
};

export type CheckoutErrorInfo = {
  title: string;
  message: string;
  isSessionMismatch?: boolean;
  isInventory?: boolean;
  isNetwork?: boolean;
};

const fieldLabels: Record<FieldName, string> = {
  fullName: "نام و نام خانوادگی",
  mobile: "شماره موبایل",
  email: "آدرس ایمیل",
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
  if (name === "email" && clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return "فرمت آدرس ایمیل معتبر نیست.";
  if (name === "province" && !clean) return "استان را انتخاب کنید.";
  if (name === "city" && !clean) return "شهر را انتخاب کنید.";
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
  const submissionLockRef = useRef(false);
  const { items, hydrated, clearCart } = useCart();
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [serverError, setServerError] = useState("");
  const [errorModal, setErrorModal] = useState<CheckoutErrorInfo | null>(null);
  const [review, setReview] = useState<CheckoutReviewSnapshot | null>(null);
  const [mobile, setMobile] = useState("");
  const [loggedInPhone, setLoggedInPhone] = useState("");
  const [verifiedMobile, setVerifiedMobile] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("manual");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");

  useEffect(() => {
    getCustomerSession()
      .then((session) => {
        setMobile(session.phone);
        setLoggedInPhone(session.phone);
        setVerifiedMobile(true);
        getCustomerProfile()
          .then((p) => {
            if (p.email) setEmail(p.email);
          })
          .catch(() => undefined);
        return getCustomerAddresses();
      })
      .then((userAddresses) => {
        if (userAddresses && userAddresses.length > 0) {
          setAddresses(userAddresses);
          const defaultAddr = userAddresses.find((a) => a.isDefault) || userAddresses[0];
          setSelectedAddressId(defaultAddr.id);
          setFullName(defaultAddr.receiverName);
          setProvince(defaultAddr.province);
          setCity(defaultAddr.city);
          setAddress(defaultAddr.address);
          setPostalCode(defaultAddr.postalCode);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleLogout() {
    try {
      await logoutCustomer();
    } catch {
      // ignore
    }
    setVerifiedMobile(false);
    setLoggedInPhone("");
    setAddresses([]);
    setSelectedAddressId("manual");
    setErrorModal(null);
  }

  function selectAddress(addr: CustomerAddress) {
    setSelectedAddressId(addr.id);
    setFullName(addr.receiverName);
    setProvince(addr.province);
    setCity(addr.city);
    setAddress(addr.address);
    setPostalCode(addr.postalCode);
    setErrors({});
  }

  function selectManual() {
    setSelectedAddressId("manual");
    setFullName("");
    setProvince("");
    setCity("");
    setAddress("");
    setPostalCode("");
    setErrors({});
  }
  
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountTotal, setDiscountTotal] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "snapppay">("online");

  const subtotal = items.reduce((total, item) => total + item.product.priceValue * item.quantity, 0);

  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const name = event.currentTarget.name as FieldName;
    if (!(name in fieldLabels)) return;
    const error = validateField(name, event.currentTarget.value);
    setErrors((current) => ({ ...current, [name]: error || undefined }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const name = event.currentTarget.name as FieldName;
    const val = event.currentTarget.value;
    if (name === "fullName") setFullName(val);
    else if (name === "mobile") setMobile(val);
    else if (name === "email") setEmail(val);
    else if (name === "province") {
      setProvince(val);
      const validCities = getIranCities(val);
      if (!validCities.includes(city)) setCity("");
    }
    else if (name === "city") setCity(val);
    else if (name === "address") setAddress(val);
    else if (name === "postalCode") setPostalCode(val);

    if (!(name in fieldLabels)) return;
    const error = validateField(name, val);
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formErrors = validateForm(form);
    setErrors(formErrors);
    const firstError = (Object.keys(fieldLabels) as FieldName[]).find((name) => formErrors[name]);
    if (firstError) {
      (event.currentTarget.elements.namedItem(firstError) as HTMLElement | null)?.focus();
      return;
    }

    const request: CheckoutRequest = {
      items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
      fullName: String(form.get("fullName") ?? "").trim(),
      phone: normalizeIranianMobile(String(form.get("mobile") ?? ""))!,
      email: String(form.get("email") ?? "").trim() || undefined,
      province: String(form.get("province") ?? "").trim(),
      city: String(form.get("city") ?? "").trim(),
      address: String(form.get("address") ?? "").trim(),
      postalCode: normalizeNumericText(String(form.get("postalCode") ?? "")),
      customerNotes: String(form.get("customerNotes") ?? "").trim() || undefined,
      couponCode: appliedCoupon ?? undefined,
    };

    setReview({
      request,
      products: items.map(({ lineId, product, quantity }) => ({
        lineId,
        name: product.name,
        capacity: product.capacity,
        image: product.image,
        quantity,
        lineTotal: product.priceValue * quantity,
      })),
      subtotal,
      discountTotal,
      total: Math.max(0, subtotal - discountTotal),
      paymentMethod,
    });
    setRequestState("idle");
    setServerError("");
    setErrorModal(null);
  }

  async function confirmOrder(customRequest?: CheckoutRequest) {
    const targetReview = customRequest ? { ...review!, request: customRequest } : review;
    if (!targetReview || submissionLockRef.current) return;
    if (!window.navigator.onLine) {
      const errInfo = parseCheckoutError(new Error("offline"));
      setServerError(errInfo.message);
      setErrorModal(errInfo);
      setRequestState("network-error");
      return;
    }

    submissionLockRef.current = true;
    setRequestState("submitting");
    setServerError("");
    setErrorModal(null);
    try {
      const order = await createOrder(targetReview.request);
      if (targetReview.paymentMethod === "online" && order?.id) {
        const payment = await initiatePayment(order.id);
        clearCart();
        if (payment?.paymentUrl) {
          window.location.href = payment.paymentUrl;
          return;
        }
      }
      clearCart();
      router.replace(`/order/success?order=${encodeURIComponent(order.number)}`);
    } catch (caught) {
      const errInfo = parseCheckoutError(caught);
      setServerError(errInfo.message);
      setErrorModal(errInfo);
      setRequestState(caught instanceof ApiError && caught.isNetworkError ? "network-error" : "server-error");
    } finally {
      submissionLockRef.current = false;
    }
  }

  async function handleLogoutAndRetry() {
    await handleLogout();
    if (review) {
      submissionLockRef.current = false;
      await confirmOrder();
    }
  }

  const editOrder = useCallback(() => {
    if (submissionLockRef.current) return;
    setReview(null);
    setErrorModal(null);
    setRequestState("idle");
    setServerError("");
  }, []);

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
      <main id="محتوا" className="commerce-page checkout-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><Link href="/cart">سبد خرید</Link><span>/</span><span aria-current="page">تکمیل سفارش</span>
          </nav>
          <CheckoutProgress current={3} />
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
              <form className="checkout-form" onSubmit={handleSubmit} noValidate aria-busy={requestState === "submitting"}>
                {Object.values(errors).some(Boolean) && (
                  <div className="checkout-form-errors" role="alert"><strong>لطفاً خطاهای مشخص‌شده در فرم را اصلاح کنید.</strong></div>
                )}
                {addresses.length > 0 && (
                  <section className="checkout-panel checkout-saved-addresses-panel" aria-labelledby="saved-addresses-title">
                    <div className="checkout-panel__heading">
                      <span className="checkout-panel__icon"><MapPinIcon className="size-5" /></span>
                      <div>
                        <h2 id="saved-addresses-title">انتخاب از آدرس‌های ذخیره‌شده</h2>
                        <p>می‌توانید یکی از آدرس‌های حساب خود را انتخاب کنید یا آدرس جدیدی وارد نمایید.</p>
                      </div>
                    </div>

                    <div className="checkout-saved-addresses-grid">
                      {addresses.map((addr) => (
                        <label
                          key={addr.id}
                          className={`checkout-address-card ${selectedAddressId === addr.id ? "checkout-address-card--selected" : ""}`}
                        >
                          <input
                            type="radio"
                            name="savedAddressSelector"
                            checked={selectedAddressId === addr.id}
                            onChange={() => selectAddress(addr)}
                          />
                          <div className="checkout-address-card-body">
                            <div className="checkout-address-card-header">
                              <strong>{addr.title}</strong>
                              {addr.isDefault && <span className="address-default-badge">پیش‌فرض</span>}
                            </div>
                            <p className="checkout-address-card-recipient">
                              {addr.receiverName} ({addr.receiverPhone})
                            </p>
                            <p className="checkout-address-card-text">
                              {addr.province}، {addr.city}، {addr.address}
                            </p>
                            <small>کد پستی: {addr.postalCode}</small>
                          </div>
                        </label>
                      ))}

                      <label
                        className={`checkout-address-card checkout-address-card--custom ${selectedAddressId === "manual" ? "checkout-address-card--selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="savedAddressSelector"
                          checked={selectedAddressId === "manual"}
                          onChange={selectManual}
                        />
                        <div className="checkout-address-card-body">
                          <strong>+ وارد کردن آدرس دیگر</strong>
                          <p>نوشتن مشخصات تحویل‌گیرنده و آدرس به صورت دستی</p>
                        </div>
                      </label>
                    </div>
                  </section>
                )}

                <section className="checkout-panel" aria-labelledby="receiver-title">
                  <div className="checkout-panel__heading">
                    <span aria-hidden="true"><UserIcon className="size-4" /></span>
                    <div>
                      <h2 id="receiver-title">اطلاعات تحویل‌گیرنده و آدرس ارسال</h2>
                      <p>مشخصات گیرنده و نشانی دقیق محل تحویل سفارش</p>
                    </div>
                  </div>
                  <div className="form-grid">
                    <label className="form-field">
                      <span>نام و نام خانوادگی *</span>
                      <input name="fullName" autoComplete="name" value={fullName} {...field("fullName")} />
                      {fieldError("fullName")}
                    </label>
                    <div className="form-field">
                      <div className="form-field__label-row">
                        <label htmlFor="checkout-mobile">شماره موبایل *</label>
                        {verifiedMobile && (
                          <button
                            type="button"
                            className="checkout-inline-logout"
                            onClick={handleLogout}
                            title="خروج از حساب جهت ثبت سفارش با شماره دیگر"
                          >
                            خروج از حساب ({loggedInPhone || mobile})
                          </button>
                        )}
                      </div>
                      <input id="checkout-mobile" name="mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲... یا +۹۸۹۱۲..." value={mobile} readOnly={verifiedMobile} aria-readonly={verifiedMobile} {...field("mobile")} />
                      {fieldError("mobile")}
                      {verifiedMobile && <small className="form-field__hint">این شماره قبلاً در حساب شما تأیید شده است. برای ثبت با شماره دیگر، روی «خروج از حساب» کلیک کنید.</small>}
                    </div>
                    <label className="form-field">
                      <span>استان *</span>
                      <select
                        name="province"
                        autoComplete="address-level1"
                        value={province}
                        {...field("province")}
                      >
                        <option value="">انتخاب استان...</option>
                        {IRAN_PROVINCES.map((prov) => (
                          <option key={prov} value={prov}>{prov}</option>
                        ))}
                      </select>
                      {fieldError("province")}
                    </label>
                    <label className="form-field">
                      <span>شهر *</span>
                      <select
                        name="city"
                        autoComplete="address-level2"
                        value={city}
                        disabled={!province}
                        {...field("city")}
                      >
                        <option value="">{province ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}</option>
                        {province && getIranCities(province).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        {city && province && !getIranCities(province).includes(city) && (
                          <option value={city}>{city}</option>
                        )}
                      </select>
                      {fieldError("city")}
                    </label>
                    <label className="form-field form-field--full">
                      <span>آدرس کامل *</span>
                      <textarea name="address" rows={2} autoComplete="street-address" placeholder="نام خیابان، کوچه، پلاک، واحد..." value={address} {...field("address")} />
                      {fieldError("address")}
                    </label>
                    <label className="form-field">
                      <span>کد پستی *</span>
                      <input name="postalCode" inputMode="numeric" autoComplete="postal-code" placeholder="۱۰ رقم بدون خط تیره" value={postalCode} {...field("postalCode")} />
                      {fieldError("postalCode")}
                    </label>
                    <label className="form-field">
                      <span>آدرس ایمیل (اختیاری)</span>
                      <input name="email" type="email" inputMode="email" autoComplete="email" dir="ltr" placeholder="example@domain.com" value={email} {...field("email")} />
                      {fieldError("email")}
                    </label>
                    <label className="form-field form-field--full">
                      <span>توضیحات سفارش (اختیاری)</span>
                      <input name="customerNotes" placeholder="نکته یا درخواستی درباره این سفارش دارید بنویسید..." />
                    </label>
                  </div>
                </section>

                <section className="checkout-panel" aria-labelledby="shipping-title">
                  <div className="checkout-panel__heading">
                    <span aria-hidden="true"><TruckIcon className="size-4" /></span>
                    <div>
                      <h2 id="shipping-title">روش ارسال</h2>
                      <p>هزینه و زمان ارسال پس از بررسی آدرس اعلام می‌شود.</p>
                    </div>
                  </div>
                  <label className="shipping-option"><input type="radio" name="shipping" defaultChecked /><span><strong>ارسال پس از هماهنگی</strong><small>هماهنگی هزینه و زمان تحویل با شما</small></span></label>
                </section>

                <button className="button button--primary checkout-submit" type="submit" disabled={requestState === "submitting"}>
                  ثبت سفارش
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

                <div className="checkout-payment-section" aria-labelledby="checkout-payment-title">
                  <div className="checkout-payment-section__header">
                    <CreditCardIcon className="size-4" />
                    <h3 id="checkout-payment-title">روش پرداخت</h3>
                  </div>
                  <div className="checkout-payment-options" role="radiogroup" aria-label="انتخاب روش پرداخت">
                    <label
                      className={`checkout-payment-option ${paymentMethod === "online" ? "checkout-payment-option--selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="checkoutPaymentMethod"
                        value="online"
                        checked={paymentMethod === "online"}
                        onChange={() => setPaymentMethod("online")}
                      />
                      <div className="checkout-payment-option__content">
                        <div className="checkout-payment-option__main">
                          <span className="checkout-payment-option__title">پرداخت آنلاین از درگاه پرداخت</span>
                          <span className="checkout-payment-option__desc">کلیه کارت‌های عضو شتاب بانکی</span>
                        </div>
                        <div className="checkout-payment-option__logos">
                          <OnlinePaymentIcon />
                        </div>
                      </div>
                    </label>

                    <label
                      className="checkout-payment-option checkout-payment-option--disabled"
                      title="پرداخت اقساطی اسنپ‌پی به‌زودی فعال خواهد شد"
                    >
                      <input
                        type="radio"
                        name="checkoutPaymentMethod"
                        value="snapppay"
                        disabled
                        checked={paymentMethod === "snapppay"}
                        onChange={() => {}}
                      />
                      <div className="checkout-payment-option__content">
                        <div className="checkout-payment-option__main">
                          <div className="checkout-payment-option__title-row">
                            <span className="checkout-payment-option__title">اسنپ‌پی</span>
                            <span className="checkout-payment-option__badge">به‌زودی</span>
                          </div>
                          <span className="checkout-payment-option__desc">پرداخت اقساطی ۴ ماهه بدون کارمزد</span>
                        </div>
                        <div className="checkout-payment-option__logos">
                          <SnappPayLogo />
                        </div>
                      </div>
                    </label>
                  </div>
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
      <CheckoutReviewDialog
        review={review}
        requestState={requestState}
        error={serverError}
        onEdit={editOrder}
        onConfirm={() => confirmOrder()}
      />
      <CheckoutErrorDialog
        error={errorModal}
        review={review}
        onClose={() => setErrorModal(null)}
        onEdit={editOrder}
        onLogoutAndRetry={handleLogoutAndRetry}
      />
    </>
  );
}

export function CheckoutReviewDialog({
  review,
  requestState,
  error,
  onEdit,
  onConfirm,
}: {
  review: CheckoutReviewSnapshot | null;
  requestState: RequestState;
  error: string;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  const submitting = requestState === "submitting";

  return (
    <AccessibleDialog open={Boolean(review)} onClose={onEdit} className="checkout-review-dialog" label="بازبینی و تأیید سفارش">
      {review && (
        <section className="checkout-review" dir="rtl" aria-busy={submitting}>
          <header className="checkout-review__header">
            <p className="section-eyebrow">مرحله نهایی</p>
            <h2>اطلاعات سفارش را بررسی کنید</h2>
            <p>اگر موردی اشتباه است، برگردید و آن را اصلاح کنید.</p>
          </header>

          <div className="checkout-review__body">
            <section className="checkout-review__section" aria-labelledby="review-customer-title">
              <h3 id="review-customer-title">مشخصات گیرنده</h3>
              <dl className="checkout-review__details">
                <div><dt>نام و نام خانوادگی</dt><dd>{review.request.fullName}</dd></div>
                <div><dt>شماره موبایل</dt><dd dir="ltr">{review.request.phone}</dd></div>
                <div><dt>آدرس ایمیل</dt><dd dir="ltr">{review.request.email || "ثبت نشده"}</dd></div>
                <div><dt>استان</dt><dd>{review.request.province}</dd></div>
                <div><dt>شهر</dt><dd>{review.request.city}</dd></div>
                <div className="checkout-review__details-full"><dt>آدرس کامل</dt><dd>{review.request.address}</dd></div>
                <div><dt>کد پستی</dt><dd dir="ltr">{review.request.postalCode}</dd></div>
                <div className="checkout-review__details-full"><dt>توضیحات سفارش</dt><dd>{review.request.customerNotes || "ثبت نشده"}</dd></div>
                <div className="checkout-review__details-full"><dt>روش ارسال</dt><dd>ارسال پس از هماهنگی</dd></div>
                <div className="checkout-review__details-full"><dt>روش پرداخت</dt><dd>{review.paymentMethod === "snapppay" ? "اسنپ‌پی (پرداخت اقساطی)" : "پرداخت آنلاین از درگاه پرداخت"}</dd></div>
              </dl>
            </section>

            <section className="checkout-review__section" aria-labelledby="review-products-title">
              <h3 id="review-products-title">خلاصه سفارش</h3>
              <div className="checkout-review__products">
                {review.products.map((product) => (
                  <div className="checkout-review__product" key={product.lineId}>
                    <div className="checkout-review__image"><Image src={product.image} alt="" fill sizes="56px" /></div>
                    <div><strong>{product.name}</strong><span>{product.capacity} · تعداد {new Intl.NumberFormat("fa-IR").format(product.quantity)}</span></div>
                    <b>{formatPrice(product.lineTotal)}</b>
                  </div>
                ))}
              </div>
              <dl className="checkout-review__totals">
                <div><dt>جمع محصولات</dt><dd>{formatPrice(review.subtotal)}</dd></div>
                {review.discountTotal > 0 && <div className="checkout-review__discount"><dt>تخفیف</dt><dd>{formatPrice(review.discountTotal)}-</dd></div>}
                <div><dt>هزینه ارسال</dt><dd>پس از بررسی آدرس</dd></div>
                <div className="checkout-review__total"><dt>مبلغ نهایی</dt><dd>{formatPrice(review.total)}</dd></div>
              </dl>
            </section>

            {(requestState === "network-error" || requestState === "server-error") && error && (
              <div className="checkout-review__error" role="alert">
                <strong>{requestState === "network-error" ? "ارتباط با شبکه برقرار نشد." : "ثبت سفارش انجام نشد."}</strong>
                <p>{error}</p>
              </div>
            )}
          </div>

          <footer className="checkout-review__actions">
            <button className="button button--secondary" type="button" onClick={onEdit} disabled={submitting}>بازگشت و ویرایش</button>
            <button className="button button--primary" type="button" onClick={onConfirm} disabled={submitting}>
              {submitting && <span className="button-spinner" aria-hidden="true" />}
              {submitting ? "در حال ثبت سفارش…" : "تأیید و ثبت سفارش"}
            </button>
          </footer>
        </section>
      )}
    </AccessibleDialog>
  );
}

export function CheckoutErrorDialog({
  error,
  review,
  onClose,
  onEdit,
  onLogoutAndRetry,
}: {
  error: CheckoutErrorInfo | null;
  review: CheckoutReviewSnapshot | null;
  onClose: () => void;
  onEdit: () => void;
  onLogoutAndRetry: () => Promise<void>;
}) {
  const [loggingOut, setLoggingOut] = useState(false);

  if (!error) return null;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await onLogoutAndRetry();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <AccessibleDialog open={Boolean(error)} onClose={onClose} className="checkout-error-dialog" label={error.title}>
      <div className="checkout-error-modal" role="alertdialog" aria-labelledby="checkout-error-title" aria-describedby="checkout-error-desc">
        <button type="button" className="checkout-error-modal__close" onClick={onClose} aria-label="بستن پنجره خطا">
          <XIcon className="size-4" />
        </button>

        <div className="checkout-error-modal__icon-badge" aria-hidden="true">
          <AlertTriangleIcon className="size-7" />
        </div>

        <div className="checkout-error-modal__header">
          <h3 id="checkout-error-title" className="checkout-error-modal__title">{error.title}</h3>
          <p id="checkout-error-desc" className="checkout-error-modal__message">{error.message}</p>
        </div>

        {error.isSessionMismatch && (
          <div className="checkout-error-modal__info-box">
            <span>شماره واردشده در فرم: <strong dir="ltr">{review?.request.phone}</strong></span>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--teal-deep)" }}>
              با خروج از حساب فعال فعلی، سفارش شما با این شماره ثبت خواهد شد.
            </p>
          </div>
        )}

        <div className="checkout-error-modal__actions">
          {error.isSessionMismatch ? (
            <>
              <button
                type="button"
                className="button button--primary"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut && <span className="button-spinner" aria-hidden="true" />}
                {loggingOut ? "در حال ثبت سفارش…" : "خروج از حساب قبلی و ثبت سفارش"}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                disabled={loggingOut}
              >
                ویرایش شماره موبایل
              </button>
            </>
          ) : error.isInventory ? (
            <>
              <Link className="button button--primary" href="/cart" onClick={onClose}>
                بررسی سبد خرید
              </Link>
              <button type="button" className="button button--secondary" onClick={onClose}>
                بستن
              </button>
            </>
          ) : (
            <button type="button" className="button button--primary" onClick={onClose}>
              متوجه شدم
            </button>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}

export function parseCheckoutError(error: unknown): CheckoutErrorInfo {
  if (typeof window !== "undefined" && !window.navigator.onLine) {
    return {
      title: "عدم دسترسی به اینترنت",
      message: "ارتباط با شبکه برقرار نیست. لطفاً اتصال اینترنت خود را بررسی کرده و مجدداً تلاش کنید.",
      isNetwork: true,
    };
  }

  if (!(error instanceof ApiError)) {
    return {
      title: "خطای پیش‌بینی‌نشده",
      message: "خطایی در فرآیند ثبت سفارش رخ داد. لطفاً چند لحظه بعد مجدداً تلاش کنید.",
    };
  }

  if (error.isNetworkError) {
    return {
      title: "خطای ارتباط با سرور",
      message: "ارتباط با سرویس فروشگاه برقرار نشد. لطفاً وضعیت اینترنت و اجرای سرور را بررسی نمایید.",
      isNetwork: true,
    };
  }

  const detail = `${error.problem?.detail ?? ""} ${error.message}`.toLowerCase();

  if (detail.includes("verified account mobile number") || detail.includes("checkout mobile number")) {
    return {
      title: "عدم تطابق شماره با حساب فعال",
      message: "شماره موبایل واردشده با حسابی که هم‌اکنون در مرورگر شما فعال است مطابقت ندارد. برای ثبت سفارش با این شماره، می‌توانید از حساب قبلی خارج شوید یا شماره را اصلاح کنید.",
      isSessionMismatch: true,
    };
  }

  if (detail.includes("available") || detail.includes("inventory") || detail.includes("stock") || detail.includes("no longer available")) {
    return {
      title: "محدودیت موجودی کالا",
      message: "موجودی یک یا چند مورد از محصولات انتخابی در سبد خرید کافی نیست یا تغییر کرده است. لطفاً سبد خرید خود را بازبینی کنید.",
      isInventory: true,
    };
  }

  if (detail.includes("idempotency") || detail.includes("concurrency")) {
    return {
      title: "تداخل در پردازش سفارش",
      message: "سفارش شما در حال پردازش بوده یا تداخلی رخ داده است. لطفاً چند لحظه صبر کرده و دوباره امتحان کنید.",
    };
  }

  if (error.problem?.detail) {
    return {
      title: "خطا در ثبت سفارش",
      message: sanitizeErrorMessage(error.problem.detail, error.status),
    };
  }

  if (error.status === 400) {
    return {
      title: "اطلاعات سفارش نامعتبر است",
      message: sanitizeErrorMessage(error.message, 400),
    };
  }

  return {
    title: "خطا در ثبت سفارش",
    message: sanitizeErrorMessage(error.message, error.status),
  };
}

export function getCheckoutErrorMessage(error: unknown) {
  return parseCheckoutError(error).message;
}
