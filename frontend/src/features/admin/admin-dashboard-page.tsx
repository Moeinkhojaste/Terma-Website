"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import {
  getDashboard,
  getAdminAnalytics,
  type Dashboard,
  type AdminAnalytics,
} from "@/features/admin/store-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  AdminTrendChart,
  OrderStatusDonut,
  TopProductsSection,
  LoyalCustomersSection,
} from "@/features/admin/components/admin-analytics-charts";
import {
  PackageIcon,
  AlertTriangleIcon,
  MessageIcon,
  TagIcon,
  BanknotesIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  BarChartIcon,
  UsersIcon,
  ShoppingCartIcon,
} from "@/components/ui/icons";

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [analytics, setAnalytics] = useState<AdminAnalytics>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getAdminAnalytics()])
      .then(([dashRes, analyticsRes]) => {
        setData(dashRes);
        setAnalytics(analyticsRes);
      })
      .catch((caught) => setError(getApiErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="داشبورد و مرکز آمار فروشگاه">
      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="admin-panel" role="status">
          در حال بارگذاری شاخص‌ها و اطلاعات آماری فروشگاه…
        </div>
      ) : (
        <>
          {/* Quick Notice Header */}
          {data && (
            <div className="admin-dashboard-overview-bar">
              <div className="dashboard-overview-item">
                <span className="overview-icon"><PackageIcon className="size-5" /></span>
                <div>
                  <small>سفارشات نیازمند بررسی</small>
                  <strong>{formatNumber(data.pendingOrderCount)} سفارش</strong>
                </div>
              </div>
              <div className="dashboard-overview-item">
                <span className="overview-icon"><AlertTriangleIcon className="size-5" /></span>
                <div>
                  <small>کالاهای رو به اتمام</small>
                  <strong style={{ color: data.lowStockCount > 0 ? "var(--danger)" : "inherit" }}>
                    {formatNumber(data.lowStockCount)} محصول
                  </strong>
                </div>
              </div>
              <div className="dashboard-overview-item">
                <span className="overview-icon"><MessageIcon className="size-5" /></span>
                <div>
                  <small>پیام‌های جدید کاربران</small>
                  <strong>{formatNumber(data.unreadMessageCount)} پیام</strong>
                </div>
              </div>
              <div className="dashboard-overview-item">
                <span className="overview-icon"><TagIcon className="size-5" /></span>
                <div>
                  <small>کالاهای فعال در سایت</small>
                  <strong>{formatNumber(data.productCount)} کالا</strong>
                </div>
              </div>
            </div>
          )}

          {/* 8 Primary Analytical Metric Cards */}
          {analytics && (
            <section className="analytics-kpi-grid" aria-label="شاخص‌های کلیدی عملکرد">
              {/* 1. Sales */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><BanknotesIcon className="size-5" /></span>
                  <span className="kpi-title">میزان فروش ریالی</span>
                  <span className="kpi-badge kpi-badge--teal">۳۰ روز و ۱ سال</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val">{formatPrice(analytics.sales.sales30Days)}</div>
                  <div className="kpi-sub-text">فروش ۳۰ روز گذشته</div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>فروش ۱ سال گذشته:</span>
                    <strong>{formatPrice(analytics.sales.sales1Year)}</strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>میانگین ارزش سفارش (AOV):</span>
                    <strong>{formatPrice(analytics.sales.averageOrderValue30Days)}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Orders */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><ReceiptIcon className="size-5" /></span>
                  <span className="kpi-title">تعداد کل سفارش‌ها</span>
                  <span className="kpi-badge kpi-badge--gold">روند سفارشات</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val">{formatNumber(analytics.sales.orders30Days)} سفارش</div>
                  <div className="kpi-sub-text">سفارشات ۳۰ روز اخیر</div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>سفارشات ۱ سال گذشته:</span>
                    <strong>{formatNumber(analytics.sales.orders1Year)} سفارش</strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>مجموع سفارشات کل تاریخ:</span>
                    <strong>{formatNumber(analytics.sales.ordersTotal)} سفارش</strong>
                  </div>
                </div>
              </div>

              {/* 3. Items Sold */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><ShoppingBagIcon className="size-5" /></span>
                  <span className="kpi-title">تعداد محصول فروخته شده</span>
                  <span className="kpi-badge kpi-badge--blue">حجم فروش</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val">{formatNumber(analytics.sales.itemsSold30Days)} عدد</div>
                  <div className="kpi-sub-text">کالای فروخته شده ۳۰ روز اخیر</div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>کالای فروخته شده ۱ سال:</span>
                    <strong>{formatNumber(analytics.sales.itemsSold1Year)} عدد</strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>مجموع کل تاریخ:</span>
                    <strong>{formatNumber(analytics.sales.itemsSoldTotal)} عدد</strong>
                  </div>
                </div>
              </div>

              {/* 4. Avg items per order */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><BarChartIcon className="size-5" /></span>
                  <span className="kpi-title">میانگین کالا در هر سفارش</span>
                  <span className="kpi-badge kpi-badge--purple">سبد خرید</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val">
                    {formatNumber(analytics.sales.averageItemsPerOrder30Days)} قلم
                  </div>
                  <div className="kpi-sub-text">میانگین اقلام سفارشات ۳۰ روز اخیر</div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>میانگین اقلام در ۱ سال گذشته:</span>
                    <strong>{formatNumber(analytics.sales.averageItemsPerOrder1Year)} قلم کالا</strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>عمق سبد خرید:</span>
                    <strong style={{ color: "var(--teal)" }}>مطلوب</strong>
                  </div>
                </div>
              </div>

              {/* 5. Registrations */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><UsersIcon className="size-5" /></span>
                  <span className="kpi-title">تعداد ثبت‌نام کاربران</span>
                  <span className="kpi-badge kpi-badge--teal">باشگاه مشتریان</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val">
                    {formatNumber(analytics.registrations.newRegistrations30Days)} کاربر
                  </div>
                  <div className="kpi-sub-text">عضویت جدید در ۳۰ روز اخیر</div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>ثبت‌نام ۱ سال گذشته:</span>
                    <strong>{formatNumber(analytics.registrations.newRegistrations1Year)} کاربر</strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>مجموع کل اعضای ثبت‌نامی:</span>
                    <strong>{formatNumber(analytics.registrations.totalRegisteredCustomers)} کاربر</strong>
                  </div>
                </div>
              </div>

              {/* 6. Abandoned Carts */}
              <div className="analytics-kpi-card">
                <div className="kpi-header">
                  <span className="kpi-icon"><ShoppingCartIcon className="size-5" /></span>
                  <span className="kpi-title">سبدهای خرید رها شده</span>
                  <span className="kpi-badge kpi-badge--danger">فرصت بازیابی</span>
                </div>
                <div className="kpi-body">
                  <div className="kpi-main-val" style={{ color: "var(--copper)" }}>
                    {formatNumber(analytics.abandonedCarts.abandonedCount30Days)} سبد
                  </div>
                  <div className="kpi-sub-text">
                    ارزش: {formatPrice(analytics.abandonedCarts.abandonedValue30Days)}
                  </div>
                </div>
                <div className="kpi-footer">
                  <div className="kpi-footer-row">
                    <span>نرخ رهاسازی ۳۰ روزه:</span>
                    <strong style={{ color: "var(--danger)" }}>
                      {analytics.abandonedCarts.abandonmentRate30Days}٪
                    </strong>
                  </div>
                  <div className="kpi-footer-row">
                    <span>انقضای پرداخت در مرحله نهایی:</span>
                    <strong>{formatNumber(analytics.abandonedCarts.expiredCheckouts30Days)} مورد</strong>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Interactive Chart Section */}
          {analytics && (
            <div className="admin-two-col-chart-grid">
              <div className="chart-main-column">
                <AdminTrendChart
                  dailyData={analytics.dailyTrend30Days}
                  monthlyData={analytics.monthlyTrend1Year}
                />
              </div>
              <div className="chart-side-column">
                <OrderStatusDonut statusBreakdown={analytics.orderStatusBreakdown} />
              </div>
            </div>
          )}

          {/* 7. Top Selling & Top Viewed Products */}
          {analytics && (
            <TopProductsSection
              topSelling={analytics.topSellingProducts30Days}
              topViewed={analytics.topViewedProducts30Days}
            />
          )}

          {/* 8. Loyal Customers Leaderboard */}
          {analytics && <LoyalCustomersSection customers={analytics.loyalCustomers} />}

          {/* Quick Actions Bar */}
          <section className="admin-panel admin-quick-actions">
            <div className="admin-panel__heading">
              <div>
                <p className="section-eyebrow">دسترسی سریع</p>
                <h2>مدیریت و عملیات فروشگاه</h2>
              </div>
              <Link href="/admin/reports" className="admin-more-link">
                مشاهده گزارش‌های جامع آماری ←
              </Link>
            </div>
            <div className="admin-action-grid">
              <Link href="/admin/products?new=1" className="admin-action-card">
                <strong>افزودن محصول جدید</strong>
                <span>تعریف کالا و تنوع سایز</span>
              </Link>
              <Link href="/admin/orders" className="admin-action-card">
                <strong>بررسی و ارسال سفارش‌ها</strong>
                <span>پیگیری مرسولات و فاکتورها</span>
              </Link>
              <Link href="/admin/reports" className="admin-action-card">
                <strong>گزارش‌های تحلیلی</strong>
                <span>سبدهای رها شده و مشتریان وفادار</span>
              </Link>
              <Link href="/admin/promotions" className="admin-action-card">
                <strong>تخفیف‌ها و کوپن‌ها</strong>
                <span>کمپین‌های تشویقی و فروش</span>
              </Link>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
