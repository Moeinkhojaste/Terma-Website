"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AccountShell } from "./components/account-shell";
import {
  getCustomerDashboard,
  orderStatusLabels,
  type CustomerDashboard,
} from "./account-api";
import { formatPrice } from "@/lib/format";
import {
  PackageIcon,
  TruckIcon,
  HeartIcon,
  MapPinIcon,
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
} from "@/components/ui/icons";

export function AccountDashboardClient() {
  const [dashboard, setDashboard] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getCustomerDashboard()
      .then(setDashboard)
      .catch((err) => setError(err.message || "خطا در دریافت اطلاعات داشبورد"))
      .finally(() => setLoading(false));
  }, []);

  function copyTracking(code: string, id: string) {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  return (
    <AccountShell>
      {loading ? (
        <div className="cart-loading" role="status">
          در حال بارگذاری اطلاعات حساب…
        </div>
      ) : error ? (
        <div className="account-error" role="alert">
          {error}
        </div>
      ) : dashboard ? (
        <div className="account-dashboard-view">
          {/* Welcome Banner */}
          <div className="dashboard-welcome-banner">
            <div>
              <h2>سلام، {dashboard.profile.fullName} عزیز</h2>
              <p>به پنل کاربری ترما خوش آمدید. در این بخش می‌توانید سفارش‌ها، آدرس‌ها و علاقه‌مندی‌های خود را مدیریت کنید.</p>
            </div>
            <span className="dashboard-date-badge">
              {new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" }).format(new Date())}
            </span>
          </div>

          {/* Quick Stat Cards */}
          <div className="dashboard-stats-grid">
            <Link href="/account/orders" className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <div className="dashboard-stat-icon dashboard-stat-icon--amber">
                  <TruckIcon className="size-5" />
                </div>
                <strong className="dashboard-stat-value">{dashboard.pendingOrders.toLocaleString("fa-IR")}</strong>
              </div>
              <div className="dashboard-stat-body">
                <span className="dashboard-stat-label">سفارش‌های در حال انجام</span>
              </div>
            </Link>

            <Link href="/account/orders" className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <div className="dashboard-stat-icon dashboard-stat-icon--blue">
                  <PackageIcon className="size-5" />
                </div>
                <strong className="dashboard-stat-value">{dashboard.totalOrders.toLocaleString("fa-IR")}</strong>
              </div>
              <div className="dashboard-stat-body">
                <span className="dashboard-stat-label">کل سفارش‌ها</span>
              </div>
            </Link>

            <Link href="/account/wishlist" className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <div className="dashboard-stat-icon dashboard-stat-icon--rose">
                  <HeartIcon className="size-5" />
                </div>
                <strong className="dashboard-stat-value">{dashboard.wishlistCount.toLocaleString("fa-IR")}</strong>
              </div>
              <div className="dashboard-stat-body">
                <span className="dashboard-stat-label">علاقه‌مندی‌ها</span>
              </div>
            </Link>

            <Link href="/account/addresses" className="dashboard-stat-card">
              <div className="dashboard-stat-top">
                <div className="dashboard-stat-icon dashboard-stat-icon--teal">
                  <MapPinIcon className="size-5" />
                </div>
                <strong className="dashboard-stat-value">{dashboard.addressCount.toLocaleString("fa-IR")}</strong>
              </div>
              <div className="dashboard-stat-body">
                <span className="dashboard-stat-label">آدرس‌های ثبت‌شده</span>
              </div>
            </Link>
          </div>

          {/* Dashboard 2-column Grid */}
          <div className="dashboard-sections-grid">
            {/* Recent Orders */}
            <div className="dashboard-section-card">
              <div className="dashboard-section-header">
                <h3>آخرین سفارش‌ها</h3>
                <Link href="/account/orders" className="text-link text-link--sm">
                  <span>مشاهده همه</span>
                  <ArrowLeftIcon className="size-3.5" />
                </Link>
              </div>

              {dashboard.recentOrders.length === 0 ? (
                <div className="dashboard-empty-card">
                  <p>هنوز هیچ سفارشی ثبت نکرده‌اید.</p>
                  <Link href="/products" className="button button--secondary button--sm">
                    مشاهده محصولات
                  </Link>
                </div>
              ) : (
                <div className="dashboard-order-list">
                  {dashboard.recentOrders.map((order) => (
                    <div key={order.id} className="dashboard-order-item">
                      <div className="dashboard-order-top">
                        <div className="dashboard-order-info">
                          <strong dir="ltr">{order.number}</strong>
                          <span>{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                        <span className={`status-pill status-pill--${order.status.toLowerCase()}`}>
                          {orderStatusLabels[order.status]}
                        </span>
                      </div>

                      {order.status === "Shipped" && order.postalTrackingCode && (
                        <div className="tracking-inline-pill">
                          <span>کد رهگیری پست:</span>
                          <code dir="ltr">{order.postalTrackingCode}</code>
                          <button
                            type="button"
                            onClick={() => copyTracking(order.postalTrackingCode!, order.id)}
                            className="tracking-copy-btn"
                            title="کپی کد رهگیری"
                          >
                            <CopyIcon className="size-3.5" />
                            <span>{copiedId === order.id ? "کپی شد" : "کپی"}</span>
                          </button>
                        </div>
                      )}

                      <div className="dashboard-order-bottom">
                        <div>
                          <span>{order.itemCount.toLocaleString("fa-IR")} کالا</span>
                          <b>{formatPrice(order.total)}</b>
                        </div>
                        <Link href={`/account/orders/${order.id}`} className="button button--secondary button--sm">
                          جزئیات سفارش
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Default Address & Quick Links */}
            <div className="dashboard-side-cards">
              <div className="dashboard-section-card">
                <div className="dashboard-section-header">
                  <h3>آدرس پیش‌فرض</h3>
                  <Link href="/account/addresses" className="text-link text-link--sm">
                    <span>مدیریت آدرس‌ها</span>
                    <ArrowLeftIcon className="size-3.5" />
                  </Link>
                </div>

                {dashboard.defaultAddress ? (
                  <div className="dashboard-address-preview">
                    <div className="address-badge-row">
                      <strong>{dashboard.defaultAddress.title}</strong>
                      <span className="address-default-badge">پیش‌فرض</span>
                    </div>
                    <p className="address-receiver">
                      {dashboard.defaultAddress.receiverName} ({dashboard.defaultAddress.receiverPhone})
                    </p>
                    <p className="address-text">
                      {dashboard.defaultAddress.province}، {dashboard.defaultAddress.city}، {dashboard.defaultAddress.address}
                    </p>
                    <p className="address-postal">کد پستی: <span dir="ltr">{dashboard.defaultAddress.postalCode}</span></p>
                  </div>
                ) : (
                  <div className="dashboard-empty-card">
                    <p>هیچ آدرسی ثبت نشده است.</p>
                    <Link href="/account/addresses" className="button button--secondary button--sm">
                      افزودن آدرس جدید
                    </Link>
                  </div>
                )}
              </div>

              {/* Quick Actions Panel */}
              <div className="dashboard-section-card dashboard-actions-card">
                <h3>دسترسی‌های سریع</h3>
                <div className="dashboard-quick-links">
                  <Link href="/account/profile" className="quick-action-link">
                    <span>ویرایش اطلاعات و شماره تماس</span>
                    <ArrowLeftIcon className="size-4" />
                  </Link>
                  <Link href="/account/wishlist" className="quick-action-link">
                    <span>مشاهده لیست علاقه‌مندی‌ها</span>
                    <ArrowLeftIcon className="size-4" />
                  </Link>
                  <a
                    href="https://tracking.post.ir/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-link"
                  >
                    <span>سامانه رهگیری مرسولات شرکت ملی پست</span>
                    <ExternalLinkIcon className="size-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AccountShell>
  );
}
