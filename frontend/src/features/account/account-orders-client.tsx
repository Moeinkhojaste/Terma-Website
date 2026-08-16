"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountShell } from "./components/account-shell";
import {
  getCustomerOrders,
  orderStatusLabels,
  type CustomerOrderSummary,
} from "./account-api";
import { formatPrice } from "@/lib/format";
import { CheckIcon, CopyIcon, PackageIcon } from "@/components/ui/icons";

type FilterTab = "ALL" | "ACTIVE" | "Shipped" | "Delivered" | "Cancelled";

export function AccountOrdersClient() {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterTab>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getCustomerOrders()
      .then((res) => setOrders(res.items))
      .catch((err) => setError(err.message || "خطا در دریافت لیست سفارش‌ها"))
      .finally(() => setLoading(false));
  }, []);

  function copyTracking(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const filteredOrders = orders.filter((order) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") {
      return (
        order.status === "PendingConfirmation" ||
        order.status === "Confirmed" ||
        order.status === "Preparing"
      );
    }
    return order.status === filter;
  });

  return (
    <AccountShell title="سفارش‌های من" breadcrumbs={[{ label: "سفارش‌های من" }]}>
      <div className="account-orders-view">
        {/* Filter Tabs */}
        <div className="orders-filter-tabs">
          <button
            type="button"
            className={`orders-filter-tab ${filter === "ALL" ? "orders-filter-tab--active" : ""}`}
            onClick={() => setFilter("ALL")}
          >
            همه سفارش‌ها ({orders.length.toLocaleString("fa-IR")})
          </button>
          <button
            type="button"
            className={`orders-filter-tab ${filter === "ACTIVE" ? "orders-filter-tab--active" : ""}`}
            onClick={() => setFilter("ACTIVE")}
          >
            جاری / در حال پردازش
          </button>
          <button
            type="button"
            className={`orders-filter-tab ${filter === "Shipped" ? "orders-filter-tab--active" : ""}`}
            onClick={() => setFilter("Shipped")}
          >
            ارسال شده
          </button>
          <button
            type="button"
            className={`orders-filter-tab ${filter === "Delivered" ? "orders-filter-tab--active" : ""}`}
            onClick={() => setFilter("Delivered")}
          >
            تحویل شده
          </button>
          <button
            type="button"
            className={`orders-filter-tab ${filter === "Cancelled" ? "orders-filter-tab--active" : ""}`}
            onClick={() => setFilter("Cancelled")}
          >
            لغو شده
          </button>
        </div>

        {loading ? (
          <div className="cart-loading" role="status">
            در حال دریافت سفارش‌ها…
          </div>
        ) : error ? (
          <div className="account-error" role="alert">
            {error}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="commerce-empty">
            <PackageIcon className="size-12 text-slate-400" />
            <h2>هیچ سفارشی در این بخش یافت نشد</h2>
            <p>می‌توانید سفارش‌های جدید خود را از طریق فروشگاه ثبت کنید.</p>
            <Link className="button button--primary" href="/products">
              مشاهده فروشگاه
            </Link>
          </div>
        ) : (
          <div className="account-order-list">
            {filteredOrders.map((order) => (
              <div className="account-order-card" key={order.id}>
                <div className="account-order-card-header">
                  <div className="account-order-header-info">
                    <div className="order-number-row">
                      <span>شماره سفارش:</span>
                      <strong dir="ltr">{order.number}</strong>
                    </div>
                    <span className="order-date">
                      {new Date(order.createdAt).toLocaleDateString("fa-IR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                    {orderStatusLabels[order.status]}
                  </span>
                </div>

                {/* Postal Tracking Snippet */}
                {order.status === "Shipped" && order.postalTrackingCode && (
                  <div className="order-card-tracking-box">
                    <div className="tracking-info-group">
                      <span className="tracking-label"><PackageIcon className="size-4" /> کد رهگیری مرسوله پستی:</span>
                      <strong dir="ltr" className="tracking-code">{order.postalTrackingCode}</strong>
                    </div>
                    <div className="tracking-actions">
                      <button
                        type="button"
                        onClick={() => copyTracking(order.postalTrackingCode!, order.id)}
                        className="button button--secondary button--sm"
                      >
                        {copiedId === order.id ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                        <span>{copiedId === order.id ? "کپی شد" : "کپی کد"}</span>
                      </button>
                      <a
                        href="https://tracking.post.ir/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button--secondary button--sm"
                      >
                        <span>رهگیری در پست</span>
                      </a>
                    </div>
                  </div>
                )}

                <div className="account-order-card-footer">
                  <div className="order-footer-details">
                    <span>تعداد اقلام: <b>{order.itemCount.toLocaleString("fa-IR")} کالا</b></span>
                    <span>مبلغ کل: <b className="order-total-price">{formatPrice(order.total)}</b></span>
                  </div>
                  <Link href={`/account/orders/${order.id}`} className="button button--primary button--sm">
                    مشاهده جزئیات سفارش
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AccountShell>
  );
}
