"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, ClockIcon, CopyIcon, MinusIcon, TruckIcon, XIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { CheckoutProgress } from "@/features/checkout/checkout-progress";
import { useCart } from "@/features/cart/cart-provider";

type StatusType = "success" | "failed" | "cancelled";

const content = {
  success: {
    eyebrow: "پرداخت و ثبت موفق",
    title: "سفارش شما با موفقیت ثبت شد",
    description: "از خرید شما سپاسگزاریم. سفارش شما دریافت شد و تیم ترما در حال هماهنگی و آماده‌سازی برای ارسال است.",
  },
  failed: {
    eyebrow: "پرداخت ناموفق",
    title: "سفارش شما ثبت نشد",
    description: "پرداخت انجام نشد یا ارتباط با درگاه قطع شد. اطلاعات سبد خرید شما حفظ شده و می‌توانید دوباره تلاش کنید.",
  },
  cancelled: {
    eyebrow: "سفارش لغوشده",
    title: "پرداخت را لغو کردید",
    description: "فرایند پرداخت متوقف شد. محصولات همچنان در سبد خرید شما ذخیره هستند.",
  },
} satisfies Record<StatusType, { eyebrow: string; title: string; description: string }>;

export function OrderStatus({
  type,
  orderNumber,
  refId,
  failureMessage,
}: {
  type: StatusType;
  orderNumber?: string;
  refId?: string;
  failureMessage?: string;
}) {
  const { clearCart } = useCart();
  const [copied, setCopied] = useState(false);
  const details = content[type];

  useEffect(() => {
    if (type === "success") {
      clearCart();
    }
  }, [type, clearCart]);

  function copyOrderNumber() {
    if (!orderNumber) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderNumber).catch(() => undefined);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main id="محتوا" className="status-page">
        <Container>
          <CheckoutProgress current={type === "success" ? 5 : 4} />
          
          <section className={`status-card status-card--${type}`}>
            {type === "success" ? (
              <>
                <div className="celebration-particles" aria-hidden="true">
                  <span className="particle particle--1" />
                  <span className="particle particle--2" />
                  <span className="particle particle--3" />
                  <span className="particle particle--4" />
                  <span className="particle particle--5" />
                  <span className="particle particle--6" />
                  <span className="particle particle--7" />
                  <span className="particle particle--8" />
                </div>

                <div className="status-icon-wrapper">
                  <div className="status-success-halo" aria-hidden="true" />
                  <div className="status-success-circle">
                    <svg
                      className="status-svg-check"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        className="check-path"
                        d="M5 13l4 4L19 7"
                        stroke="#ffffff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="status-icon-wrapper">
                <span className="status-card__icon">
                  {type === "failed" ? <XIcon className="size-7" /> : <MinusIcon className="size-7" />}
                </span>
              </div>
            )}

            <p className="section-eyebrow status-card-eyebrow">{details.eyebrow}</p>
            <h1 className="status-card-title">{details.title}</h1>
            <p className="status-card-desc">{failureMessage || details.description}</p>

            {orderNumber && (
              <div className="order-number-card">
                <div className="order-number-info">
                  <span>کد پیگیری و شماره سفارش</span>
                  <strong dir="ltr">{orderNumber}</strong>
                </div>
                <button
                  type="button"
                  className={`order-copy-btn ${copied ? "order-copy-btn--copied" : ""}`}
                  onClick={copyOrderNumber}
                  aria-label="کپی شماره سفارش"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-4" /> کپی شد
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-4" /> کپی کد
                    </>
                  )}
                </button>
              </div>
            )}

            {type === "success" && refId && (
              <div className="order-number-card" style={{ marginTop: "0.75rem" }}>
                <div className="order-number-info">
                  <span>شماره پیگیری پرداخت بانکی (RefID)</span>
                  <strong dir="ltr">{refId}</strong>
                </div>
              </div>
            )}

            {type === "success" && (
              <div className="status-next-steps" aria-label="مراحل پردازش سفارش">
                <div className="next-step-item next-step-item--done">
                  <span className="next-step-item__icon"><CheckIcon className="size-4" /></span>
                  <strong>ثبت سفارش</strong>
                  <small>با موفقیت ثبت شد</small>
                </div>
                <div className="next-step-item next-step-item--active">
                  <span className="next-step-item__icon"><ClockIcon className="size-4" /></span>
                  <strong>آماده‌سازی</strong>
                  <small>بررسی و هماهنگی ترما</small>
                </div>
                <div className="next-step-item">
                  <span className="next-step-item__icon"><TruckIcon className="size-4" /></span>
                  <strong>ارسال</strong>
                  <small>تحویل به آدرس شما</small>
                </div>
              </div>
            )}

            <div className="status-actions">
              {type === "success" ? (
                <>
                  <Link className="button button--primary" href="/account/orders">
                    مشاهده سفارش در پنل
                  </Link>
                  <Link className="button button--secondary" href="/products">
                    ادامه خرید از فروشگاه
                  </Link>
                  <Link className="button button--secondary" href="/">
                    بازگشت به خانه
                  </Link>
                </>
              ) : (
                <>
                  <Link className="button button--primary" href="/checkout">
                    تلاش دوباره
                  </Link>
                  <Link className="button button--secondary" href="/cart">
                    بازگشت به سبد خرید
                  </Link>
                </>
              )}
            </div>
          </section>
        </Container>
      </main>
  );
}
