"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccountShell } from "./components/account-shell";
import { formatPrice, formatPersianDateTime } from "@/lib/format";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import {
  getCustomerOrder,
  orderStatusLabels,
  type CustomerOrderDetails,
  type OrderStatus,
} from "./account-api";
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MapPinIcon,
  TruckIcon,
} from "@/components/ui/icons";

const STEPS: { key: OrderStatus; label: string }[] = [
  { key: "PendingConfirmation", label: "ثبت سفارش" },
  { key: "Confirmed", label: "تأیید سفارش" },
  { key: "Preparing", label: "آماده‌سازی بسته" },
  { key: "Shipped", label: "ارسال مرسوله" },
  { key: "Delivered", label: "تحویل مشتری" },
];

function getStepIndex(status: OrderStatus): number {
  switch (status) {
    case "PendingConfirmation":
      return 0;
    case "Confirmed":
      return 1;
    case "Preparing":
      return 2;
    case "Shipped":
      return 3;
    case "Delivered":
      return 4;
    default:
      return -1;
  }
}

export function AccountOrderClient({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<CustomerOrderDetails>();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getCustomerOrder(id)
      .then(setOrder)
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 401) {
          router.replace("/account/login");
        } else {
          setError(getApiErrorMessage(caught));
        }
      });
  }, [id, router]);

  function copyTrackingCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const currentStep = order ? getStepIndex(order.status) : -1;
  const isCancelled = order?.status === "Cancelled" || order?.status === "Expired";

  return (
    <AccountShell
      title="جزئیات سفارش"
      breadcrumbs={[
        { label: "سفارش‌های من", href: "/account/orders" },
        { label: order ? `سفارش ${order.number}` : "جزئیات سفارش" },
      ]}
    >
      {error ? (
        <div className="account-error" role="alert">
          {error}
        </div>
      ) : !order ? (
        <div className="cart-loading" role="status">
          در حال دریافت مشخصات سفارش…
        </div>
      ) : (
        <div className="order-details-view">
          {/* Header Card */}
          <div className="order-details-header-card">
            <div className="order-details-header-info">
              <span className="order-details-eyebrow">مشخصات فاکتور</span>
              <h2 dir="ltr" className="order-details-number">
                {order.number}
              </h2>
              <p className="order-details-date">
                ثبت شده در {formatPersianDateTime(order.createdAt)}
              </p>
            </div>
            <span className={`status-pill status-pill--lg status-pill--${order.status.toLowerCase()}`}>
              {orderStatusLabels[order.status]}
            </span>
          </div>

          {/* Postal Tracking Highlight Box */}
          {(order.status === "Shipped" || order.postalTrackingCode) && (
            <div className="postal-tracking-highlight-box">
              <div className="postal-tracking-content">
                <div className="postal-tracking-icon">
                  <TruckIcon className="size-8" />
                </div>
                <div className="postal-tracking-info">
                  <h3>کد رهگیری مرسوله پستی</h3>
                  <p>
                    سفارش شما تحویل شرکت ملی پست گردیده است. با استفاده از کد رهگیری زیر می‌توانید مسیر ارسال بسته را پیگیری کنید:
                  </p>
                  <div className="postal-tracking-code-row">
                    <strong dir="ltr" className="postal-code-value">
                      {order.postalTrackingCode || "در انتظار درج توسط اداره پست"}
                    </strong>
                    {order.postalTrackingCode && (
                      <button
                        type="button"
                        onClick={() => copyTrackingCode(order.postalTrackingCode!)}
                        className="button button--secondary button--sm"
                      >
                        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                        <span>{copied ? "کپی شد" : "کپی کد رهگیری"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="postal-tracking-footer">
                <a
                  href="https://tracking.post.ir/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button--primary button--sm"
                >
                  <span>ورود به سامانه پیگیری پست</span>
                  <ExternalLinkIcon className="size-4" />
                </a>
              </div>
            </div>
          )}

          {/* Order Progress Stepper */}
          {!isCancelled && (
            <div className="order-stepper-card">
              <h3>مراحل پردازش و تحویل سفارش</h3>
              <div className="order-stepper">
                {STEPS.map((step, idx) => {
                  const isPassed = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  return (
                    <div
                      key={step.key}
                      className={`order-stepper-step ${isPassed ? "order-stepper-step--passed" : ""} ${
                        isCurrent ? "order-stepper-step--current" : ""
                      }`}
                    >
                      <div className="order-stepper-node">
                        {isPassed ? <CheckIcon className="size-4" /> : <span>{idx + 1}</span>}
                      </div>
                      <span className="order-stepper-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grid: Items & Order Totals/Address */}
          <div className="order-details-grid">
            {/* Products List */}
            <div className="order-items-card">
              <div className="order-items-card-header">
                <h3>اقلام سفارش ({order.items.length.toLocaleString("fa-IR")} محصول)</h3>
                <span className="order-items-note">قیمت ثبت‌شده در لحظه خرید (تضمین‌شده)</span>
              </div>

              <div className="order-items-table-wrap">
                <table className="order-items-table">
                  <thead>
                    <tr>
                      <th>محصول</th>
                      <th>کد محصول (SKU)</th>
                      <th>قیمت واحد</th>
                      <th>تعداد</th>
                      <th>جمع کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={`${item.productId}-${item.variantId ?? index}`}>
                        <td>
                          <strong>{item.productName}</strong>
                        </td>
                        <td dir="ltr" className="sku-cell">
                          {item.sku}
                        </td>
                        <td>{formatPrice(item.unitPrice)}</td>
                        <td>{item.quantity.toLocaleString("fa-IR")}</td>
                        <td>
                          <b>{formatPrice(item.lineTotal)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar Summary & Address */}
            <div className="order-summary-sidebar">
              {/* Financial Breakdown */}
              <div className="order-summary-card">
                <h3>خلاصه مالی</h3>
                <dl className="order-totals-list">
                  <div>
                    <dt>جمع کل اقلام</dt>
                    <dd>{formatPrice(order.subtotal)}</dd>
                  </div>
                  {order.discountTotal > 0 && (
                    <div className="discount-row">
                      <dt>تخفیف</dt>
                      <dd>- {formatPrice(order.discountTotal)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>هزینه ارسال</dt>
                    <dd>{order.shippingTotal === 0 ? "رایگان" : formatPrice(order.shippingTotal)}</dd>
                  </div>
                  <div className="order-total-final">
                    <dt>مبلغ نهایی پرداختی</dt>
                    <dd>
                      <b>{formatPrice(order.total)}</b>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Delivery Address */}
              <div className="order-summary-card">
                <div className="order-address-card-header">
                  <MapPinIcon className="size-5 text-amber-800" />
                  <h3>آدرس و تحویل‌گیرنده</h3>
                </div>
                <address className="order-address-body">
                  <p className="receiver-line">
                    <strong>{order.fullName}</strong> | <span dir="ltr">{order.phone}</span>
                  </p>
                  <p className="location-line">
                    استان {order.province}، شهر {order.city}
                  </p>
                  <p className="full-address-line">{order.address}</p>
                  <p className="postal-code-line">
                    کد پستی: <span dir="ltr">{order.postalCode}</span>
                  </p>
                </address>
              </div>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
