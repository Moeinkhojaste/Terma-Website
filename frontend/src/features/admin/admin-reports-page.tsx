"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import {
  getAdminAnalytics,
  getAbandonedCarts,
  type AdminAnalytics,
  type AbandonedCartsReport,
} from "@/features/admin/store-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatNumber, formatPrice } from "@/lib/format";
import {
  AdminTrendChart,
  OrderStatusDonut,
  TopProductsSection,
  LoyalCustomersSection,
  AbandonedCartsSection,
} from "@/features/admin/components/admin-analytics-charts";
import {
  BarChartIcon,
  TrendingUpIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  TrophyIcon,
  BanknotesIcon,
  ReceiptIcon,
  UsersIcon,
} from "@/components/ui/icons";

type ReportTab = "overview" | "trends" | "products" | "abandoned" | "customers";

export function AdminReportsPage() {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [analytics, setAnalytics] = useState<AdminAnalytics>();
  const [abandonedReport, setAbandonedReport] = useState<AbandonedCartsReport>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminAnalytics(), getAbandonedCarts(1, 50)])
      .then(([analyticsRes, abandonedRes]) => {
        setAnalytics(analyticsRes);
        setAbandonedReport(abandonedRes);
      })
      .catch((caught) => setError(getApiErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="مرکز تحلیل و گزارش‌های فروشگاه">
      {error && (
        <div className="admin-alert admin-alert--error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="admin-panel" role="status">
          در حال محاسبه و آماده‌سازی گزارش‌های هوشمند…
        </div>
      ) : analytics ? (
        <div className="admin-analytics-hub">
          {/* Top navigation tabs */}
          <div className="analytics-tabs-header" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "overview"}
              className={`analytics-tab-btn ${tab === "overview" ? "active" : ""}`}
              onClick={() => setTab("overview")}
            >
              <BarChartIcon className="size-4" />
              <span>نمای کلی و شاخص‌ها</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "trends"}
              className={`analytics-tab-btn ${tab === "trends" ? "active" : ""}`}
              onClick={() => setTab("trends")}
            >
              <TrendingUpIcon className="size-4" />
              <span>روندهای زمانی و نمودارها</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "products"}
              className={`analytics-tab-btn ${tab === "products" ? "active" : ""}`}
              onClick={() => setTab("products")}
            >
              <ShoppingBagIcon className="size-4" />
              <span>کالاهای پرفروش و پربازدید</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "abandoned"}
              className={`analytics-tab-btn ${tab === "abandoned" ? "active" : ""}`}
              onClick={() => setTab("abandoned")}
            >
              <ShoppingCartIcon className="size-4" />
              <span>سبدهای رها شده ({formatNumber(analytics.abandonedCarts.abandonedCount30Days)})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "customers"}
              className={`analytics-tab-btn ${tab === "customers" ? "active" : ""}`}
              onClick={() => setTab("customers")}
            >
              <TrophyIcon className="size-4" />
              <span>مشتریان وفادار ({formatNumber(analytics.loyalCustomers.length)})</span>
            </button>
          </div>

          {/* TAB 1: Overview */}
          {tab === "overview" && (
            <div className="analytics-tab-content">
              <section className="analytics-kpi-grid">
                {/* 1. Sales */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><BanknotesIcon className="size-5" /></span>
                    <span className="kpi-title">میزان فروش</span>
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
                      <span>فروش کل از ابتدا:</span>
                      <strong>{formatPrice(analytics.sales.allTimeValidSales)}</strong>
                    </div>
                    <div className="kpi-footer-row">
                      <span>میانگین هر سفارش ۳۰ روزه:</span>
                      <strong>{formatPrice(analytics.sales.averageOrderValue30Days)}</strong>
                    </div>
                    <div className="kpi-footer-row">
                      <span>میانگین هر سفارش ۱ ساله:</span>
                      <strong>{formatPrice(analytics.sales.averageOrderValue1Year)}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Orders */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><ReceiptIcon className="size-5" /></span>
                    <span className="kpi-title">میزان سفارش‌ها</span>
                    <span className="kpi-badge kpi-badge--gold">تعداد سفارشات</span>
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
                      <span>مجموع کل سفارشات تاریخ:</span>
                      <strong>{formatNumber(analytics.sales.ordersTotal)} سفارش</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Items Sold */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><ShoppingBagIcon className="size-5" /></span>
                    <span className="kpi-title">تعداد محصول فروخته شده</span>
                    <span className="kpi-badge kpi-badge--blue">حجم اقلام</span>
                  </div>
                  <div className="kpi-body">
                    <div className="kpi-main-val">{formatNumber(analytics.sales.itemsSold30Days)} عدد</div>
                    <div className="kpi-sub-text">کالای تحویل شده در ۳۰ روز</div>
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

                {/* 4. Average items per order */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><BarChartIcon className="size-5" /></span>
                    <span className="kpi-title">میانگین محصول در سفارش</span>
                    <span className="kpi-badge kpi-badge--purple">سبد خرید</span>
                  </div>
                  <div className="kpi-body">
                    <div className="kpi-main-val">
                      {formatNumber(analytics.sales.averageItemsPerOrder30Days)} قلم
                    </div>
                    <div className="kpi-sub-text">میانگین تعداد محصول هر سفارش ۳۰ روزه</div>
                  </div>
                  <div className="kpi-footer">
                    <div className="kpi-footer-row">
                      <span>میانگین ۱ سال گذشته:</span>
                      <strong>{formatNumber(analytics.sales.averageItemsPerOrder1Year)} قلم کالا</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Registrations */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><UsersIcon className="size-5" /></span>
                    <span className="kpi-title">تعداد ثبت‌نام کاربران</span>
                    <span className="kpi-badge kpi-badge--teal">رشد کاربران</span>
                  </div>
                  <div className="kpi-body">
                    <div className="kpi-main-val">
                      {formatNumber(analytics.registrations.newRegistrations30Days)} کاربر
                    </div>
                    <div className="kpi-sub-text">عضویت جدید ۳۰ روز گذشته</div>
                  </div>
                  <div className="kpi-footer">
                    <div className="kpi-footer-row">
                      <span>ثبت‌نام ۱ سال گذشته:</span>
                      <strong>{formatNumber(analytics.registrations.newRegistrations1Year)} کاربر</strong>
                    </div>
                    <div className="kpi-footer-row">
                      <span>مجموع کل مشتریان عضو:</span>
                      <strong>{formatNumber(analytics.registrations.totalRegisteredCustomers)} کاربر</strong>
                    </div>
                    <div className="kpi-footer-row">
                      <span>مشتریان مهمان (بدون رمز):</span>
                      <strong>{formatNumber(analytics.registrations.guestCustomers)} کاربر</strong>
                    </div>
                  </div>
                </div>

                {/* 6. Abandoned Carts */}
                <div className="analytics-kpi-card">
                  <div className="kpi-header">
                    <span className="kpi-icon"><ShoppingCartIcon className="size-5" /></span>
                    <span className="kpi-title">سبدهای خرید رها شده</span>
                    <span className="kpi-badge kpi-badge--danger">بازیابی</span>
                  </div>
                  <div className="kpi-body">
                    <div className="kpi-main-val" style={{ color: "var(--copper)" }}>
                      {formatNumber(analytics.abandonedCarts.abandonedCount30Days)} سبد
                    </div>
                    <div className="kpi-sub-text">
                      ارزش ریالی: {formatPrice(analytics.abandonedCarts.abandonedValue30Days)}
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
                      <span>سبدهای رها شده ۱ سال گذشته:</span>
                      <strong>{formatNumber(analytics.abandonedCarts.abandonedCount1Year)} مورد</strong>
                    </div>
                    <div className="kpi-footer-row">
                      <span>ارزش رها شده ۱ سال:</span>
                      <strong>{formatPrice(analytics.abandonedCarts.abandonedValue1Year)}</strong>
                    </div>
                  </div>
                </div>
              </section>

              {/* Mini Trend & Status Preview */}
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
            </div>
          )}

          {/* TAB 2: Trends */}
          {tab === "trends" && (
            <div className="analytics-tab-content">
              <AdminTrendChart
                dailyData={analytics.dailyTrend30Days}
                monthlyData={analytics.monthlyTrend1Year}
              />
              <div style={{ marginTop: "1.5rem" }}>
                <OrderStatusDonut statusBreakdown={analytics.orderStatusBreakdown} />
              </div>
            </div>
          )}

          {/* TAB 3: Products */}
          {tab === "products" && (
            <div className="analytics-tab-content">
              <TopProductsSection
                topSelling={analytics.topSellingProducts30Days}
                topViewed={analytics.topViewedProducts30Days}
              />
            </div>
          )}

          {/* TAB 4: Abandoned */}
          {tab === "abandoned" && (
            <div className="analytics-tab-content">
              <div className="admin-panel" style={{ marginBottom: "1.5rem" }}>
                <div className="admin-panel__heading">
                  <div>
                    <p className="section-eyebrow">شاخص‌های بازیابی سبد خرید</p>
                    <h2>تحلیل سبدهای رها شده و انقضای پرداخت</h2>
                  </div>
                </div>
                <div className="analytics-metric-row">
                  <div className="metric-box">
                    <span>سبدهای رها شده ۳۰ روز:</span>
                    <strong>{formatNumber(analytics.abandonedCarts.abandonedCount30Days)} سبد</strong>
                  </div>
                  <div className="metric-box">
                    <span>ارزش از دست رفته ۳۰ روز:</span>
                    <strong style={{ color: "var(--copper)" }}>
                      {formatPrice(analytics.abandonedCarts.abandonedValue30Days)}
                    </strong>
                  </div>
                  <div className="metric-box">
                    <span>نرخ رهاسازی:</span>
                    <strong style={{ color: "var(--danger)" }}>
                      {analytics.abandonedCarts.abandonmentRate30Days}٪
                    </strong>
                  </div>
                  <div className="metric-box">
                    <span>انقضای رزرو در مرحله پرداخت:</span>
                    <strong>
                      {formatNumber(analytics.abandonedCarts.expiredCheckouts30Days)} فاکتور (
                      {formatPrice(analytics.abandonedCarts.expiredCheckoutsValue30Days)})
                    </strong>
                  </div>
                </div>
              </div>

              <AbandonedCartsSection
                abandonedCarts={abandonedReport?.items || []}
              />
            </div>
          )}

          {/* TAB 5: Loyal Customers */}
          {tab === "customers" && (
            <div className="analytics-tab-content">
              <LoyalCustomersSection customers={analytics.loyalCustomers} />
            </div>
          )}
        </div>
      ) : null}
    </AdminShell>
  );
}
