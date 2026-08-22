"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatNumber, formatPrice, toPersianDigits } from "@/lib/format";
import {
  BanknotesIcon,
  PackageIcon,
  ShoppingBagIcon,
  LightbulbIcon,
  FlameIcon,
  EyeIcon,
  MedalIcon,
  TrophyIcon,
  DiamondIcon,
} from "@/components/ui/icons";
import type {
  AdminAnalytics,
  DailyMetricPoint,
  MonthlyMetricPoint,
  TopSellingProduct,
  TopViewedProduct,
  LoyalCustomer,
  AbandonedCartDetails,
} from "@/features/admin/store-api";

export type MetricType = "sales" | "orders" | "items";
export type TimeRange = "30days" | "1year";

export function AdminTrendChart({
  dailyData = [],
  monthlyData = [],
}: {
  dailyData?: DailyMetricPoint[];
  monthlyData?: MonthlyMetricPoint[];
}) {
  const [metric, setMetric] = useState<MetricType>("sales");
  const [range, setRange] = useState<TimeRange>("30days");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const rawPoints = useMemo(() => {
    const list = range === "30days" ? (dailyData || []) : (monthlyData || []);
    return Array.isArray(list) ? list : [];
  }, [range, dailyData, monthlyData]);

  const points = useMemo(() => {
    if (!rawPoints || rawPoints.length === 0) return [];
    return rawPoints.map((p) => {
      const rawLabel =
        "persianDate" in p && p.persianDate
          ? p.persianDate
          : "persianMonth" in p && p.persianMonth
          ? p.persianMonth
          : "";
      const label = toPersianDigits(rawLabel);
      const shortLabel =
        rawLabel.length > 5
          ? toPersianDigits(rawLabel.slice(5))
          : toPersianDigits(rawLabel);
      const obj = p as Record<string, unknown>;
      const rawSales = p.sales ?? (typeof obj.salesAmount === "number" ? obj.salesAmount : 0);
      const rawOrders = p.orderCount ?? (typeof obj.orders === "number" ? obj.orders : 0);
      const rawItems = p.itemsSold ?? (typeof obj.items === "number" ? obj.items : 0);
      const numVal =
        metric === "sales"
          ? Number(rawSales)
          : metric === "orders"
          ? Number(rawOrders)
          : Number(rawItems);
      const value = isNaN(numVal) ? 0 : numVal;
      return { label, shortLabel, value, raw: p };
    });
  }, [rawPoints, metric]);

  const values = points.map((p) => p.value);
  const maxValue = Math.max(...values, 1) || 1;
  const totalValue = values.reduce((acc, cur) => acc + (isNaN(cur) ? 0 : cur), 0);
  const avgValue = values.length > 0 ? totalValue / values.length : 0;

  // Compute neat Y-axis ticks
  const yTicks = useMemo(() => {
    const safeMax = Math.max(maxValue, 1);
    if (safeMax <= 5 && Number.isInteger(safeMax)) {
      return Array.from({ length: safeMax + 1 }, (_, i) => ({
        val: i,
        ratio: i / safeMax,
      }));
    }
    return [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      val: Math.round(safeMax * ratio),
      ratio,
    }));
  }, [maxValue]);

  // SVG dimensions
  const width = 800;
  const height = 280;
  const paddingX = 45;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const coords = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((p, idx) => {
      const x = paddingX + (idx / Math.max(points.length - 1, 1)) * chartW;
      const safeVal = isNaN(p.value) ? 0 : p.value;
      const safeMax = isNaN(maxValue) || maxValue <= 0 ? 1 : maxValue;
      const y = paddingTop + chartH - (safeVal / safeMax) * chartH;
      return {
        x: isNaN(x) ? paddingX : x,
        y: isNaN(y) ? paddingTop + chartH : y,
        point: p,
        index: idx,
      };
    });
  }, [points, maxValue, chartW, chartH]);

  const linePath = useMemo(() => {
    if (coords.length === 0) return "";
    return coords.reduce((acc, c, i) => {
      if (i === 0) return `M ${c.x} ${c.y}`;
      // Smooth cubic bezier
      const prev = coords[i - 1];
      const cx1 = prev.x + (c.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (c.x - prev.x) / 2;
      const cy2 = c.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${c.x} ${c.y}`;
    }, "");
  }, [coords]);

  const areaPath = useMemo(() => {
    if (coords.length === 0) return "";
    const first = coords[0];
    const last = coords[coords.length - 1];
    const baseline = paddingTop + chartH;
    return `${linePath} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [linePath, coords, chartH]);

  const hovered = hoverIndex !== null && coords[hoverIndex] ? coords[hoverIndex] : null;

  return (
    <div className="analytics-chart-container">
      <div className="analytics-chart-header">
        <div className="analytics-chart-title">
          <p className="section-eyebrow">نمودار تحلیلی روند</p>
          <h3>
            {metric === "sales" && "روند فروش ریالی"}
            {metric === "orders" && "روند تعداد سفارشات"}
            {metric === "items" && "روند اقلام فروخته‌شده"}
          </h3>
        </div>

        <div className="analytics-chart-controls">
          <div className="analytics-pill-group" role="group" aria-label="انتخاب شاخص">
            <button
              type="button"
              className={`analytics-pill-btn ${metric === "sales" ? "active" : ""}`}
              onClick={() => setMetric("sales")}
            >
              <BanknotesIcon className="size-4" />
              <span>مبلغ فروش</span>
            </button>
            <button
              type="button"
              className={`analytics-pill-btn ${metric === "orders" ? "active" : ""}`}
              onClick={() => setMetric("orders")}
            >
              <PackageIcon className="size-4" />
              <span>سفارشات</span>
            </button>
            <button
              type="button"
              className={`analytics-pill-btn ${metric === "items" ? "active" : ""}`}
              onClick={() => setMetric("items")}
            >
              <ShoppingBagIcon className="size-4" />
              <span>تعداد کالا</span>
            </button>
          </div>

          <div className="analytics-pill-group" role="group" aria-label="بازه زمانی">
            <button
              type="button"
              className={`analytics-pill-btn ${range === "30days" ? "active" : ""}`}
              onClick={() => {
                setRange("30days");
                setHoverIndex(null);
              }}
            >
              ۳۰ روز گذشته
            </button>
            <button
              type="button"
              className={`analytics-pill-btn ${range === "1year" ? "active" : ""}`}
              onClick={() => {
                setRange("1year");
                setHoverIndex(null);
              }}
            >
              ۱ سال گذشته
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-chart-summary-bar">
        <div className="analytics-summary-item">
          <span>مجموع در این دوره:</span>
          <strong>
            {metric === "sales"
              ? formatPrice(totalValue)
              : `${formatNumber(totalValue)} ${metric === "orders" ? "سفارش" : "عدد"}`}
          </strong>
        </div>
        <div className="analytics-summary-item">
          <span>میانگین {range === "30days" ? "روزانه" : "ماهانه"}:</span>
          <strong>
            {metric === "sales"
              ? formatPrice(Math.round(avgValue))
              : `${formatNumber(
                  avgValue > 0 && avgValue < 10 && avgValue % 1 !== 0
                    ? Number(avgValue.toFixed(1))
                    : Math.round(avgValue)
                )} ${metric === "orders" ? "سفارش" : "عدد"}`}
          </strong>
        </div>
        <div className="analytics-summary-item">
          <span>بالاترین رکورد:</span>
          <strong>
            {metric === "sales"
              ? formatPrice(maxValue)
              : `${formatNumber(maxValue)} ${metric === "orders" ? "سفارش" : "عدد"}`}
          </strong>
        </div>
      </div>

      {totalValue === 0 && (
        <div className="analytics-empty-chart-notice">
          <LightbulbIcon className="size-4 shrink-0" />
          <span>هنوز سفارشی در این بازه ثبت نشده است؛ پس از تکمیل سفارشات، نمودار به طور خودکار ترسیم می‌شود.</span>
        </div>
      )}

      <div className="analytics-svg-wrapper">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="analytics-svg-chart"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#145a55" stopOpacity="0.32" />
              <stop offset="90%" stopColor="#145a55" stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#145a55" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Grid lines */}
          {yTicks.map(({ val, ratio }) => {
            const y = paddingTop + chartH * (1 - ratio);
            return (
              <g key={ratio} className="analytics-grid-row">
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#e8e2d7"
                  strokeDasharray={ratio === 0 ? undefined : "4 4"}
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#8c8275"
                  className="analytics-axis-text"
                >
                  {metric === "sales"
                    ? val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)} م`
                      : formatNumber(val)
                    : formatNumber(val)}
                </text>
              </g>
            );
          })}

          {/* Area & Line */}
          {coords.length > 1 && (
            <>
              <path d={areaPath} fill="url(#chartGradient)" />
              <path
                d={linePath}
                fill="none"
                stroke="#145a55"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
              />
            </>
          )}

          {/* Hover crosshair line */}
          {hovered && (
            <line
              x1={hovered.x}
              y1={paddingTop}
              x2={hovered.x}
              y2={paddingTop + chartH}
              stroke="#b58a4a"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Data Points */}
          {coords.map((c, i) => {
            const isHovered = hoverIndex === i;
            const showTick =
              range === "1year" || i === 0 || i === coords.length - 1 || i % 5 === 0;

            return (
              <g key={i}>
                {/* Hit area for mouse */}
                <rect
                  x={c.x - chartW / Math.max(coords.length, 1) / 2}
                  y={paddingTop}
                  width={chartW / Math.max(coords.length, 1)}
                  height={chartH + paddingBottom}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(i)}
                  style={{ cursor: "pointer" }}
                />

                {/* Point circle */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isHovered ? 6.5 : coords.length <= 15 ? 4 : 2.5}
                  fill={isHovered ? "#b58a4a" : "#fff"}
                  stroke="#145a55"
                  strokeWidth={isHovered ? 2.5 : 2}
                  style={{ transition: "all 0.15s ease" }}
                />

                {/* X-axis Label */}
                {showTick && (
                  <text
                    x={c.x}
                    y={paddingTop + chartH + 20}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#716b64"
                    className="analytics-axis-text"
                    style={{ direction: "ltr", unicodeBidi: "isolate" }}
                  >
                    {c.point.shortLabel}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hovered && (
          <div
            className="analytics-floating-tooltip"
            style={{
              left: `${(hovered.x / width) * 100}%`,
              top: `${Math.max(10, (hovered.y / height) * 100 - 25)}%`,
            }}
          >
            <div className="tooltip-date">{hovered.point.label}</div>
            <div className="tooltip-value">
              {metric === "sales"
                ? formatPrice(hovered.point.value)
                : `${formatNumber(hovered.point.value)} ${metric === "orders" ? "سفارش" : "عدد کالا"}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderStatusDonut({
  statusBreakdown = [],
}: {
  statusBreakdown?: AdminAnalytics["orderStatusBreakdown"];
}) {
  const safeBreakdown = Array.isArray(statusBreakdown) ? statusBreakdown : [];
  const totalCount = safeBreakdown.reduce((acc, cur) => acc + (cur.count || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "#145a55"; // Teal
      case "Processing":
      case "Confirmed":
        return "#2563eb"; // Blue
      case "Shipped":
        return "#7c3aed"; // Purple
      case "PendingPayment":
        return "#d97706"; // Amber
      case "Cancelled":
        return "#dc2626"; // Red
      case "Expired":
        return "#64748b"; // Slate
      default:
        return "#0284c7";
    }
  };

  return (
    <div className="admin-panel analytics-donut-card">
      <div className="admin-panel__heading">
        <div>
          <p className="section-eyebrow">تفکیک وضعیت‌ها</p>
          <h2>توزیع وضعیت سفارشات</h2>
        </div>
        <span className="status-pill status-pill--success">مجموع: {formatNumber(totalCount)} سفارش</span>
      </div>

      <div className="status-progress-bars">
        {safeBreakdown.map((item) => {
          const count = item.count || 0;
          const percent = totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : "0";
          const color = getStatusColor(item.status);
          return (
            <div key={item.status} className="status-progress-item">
              <div className="status-progress-header">
                <span className="status-indicator-dot" style={{ backgroundColor: color }} />
                <span className="status-name">{item.persianStatus || item.status}</span>
                <span className="status-count-badge">
                  {formatNumber(count)} سفارش ({percent}٪)
                </span>
                <strong className="status-value-text">{formatPrice(item.totalValue || 0)}</strong>
              </div>
              <div className="status-progress-track">
                <div
                  className="status-progress-fill"
                  style={{ width: `${percent}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TopProductsSection({
  topSelling = [],
  topViewed = [],
}: {
  topSelling?: TopSellingProduct[];
  topViewed?: TopViewedProduct[];
}) {
  const [activeTab, setActiveTab] = useState<"selling" | "viewed">("selling");
  const safeSelling = Array.isArray(topSelling) ? topSelling : [];
  const safeViewed = Array.isArray(topViewed) ? topViewed : [];

  return (
    <div className="admin-panel analytics-top-products-panel">
      <div className="admin-panel__heading">
        <div>
          <p className="section-eyebrow">عملکرد محصولات (۳۰ روز گذشته)</p>
          <h2 className="flex items-center gap-2">
            {activeTab === "selling" ? (
              <>
                <FlameIcon className="size-5 text-copper shrink-0" />
                <span>پرفروش‌ترین محصولات</span>
              </>
            ) : (
              <>
                <EyeIcon className="size-5 text-teal shrink-0" />
                <span>پربازدیدترین محصولات</span>
              </>
            )}
          </h2>
        </div>
        <div className="analytics-pill-group">
          <button
            type="button"
            className={`analytics-pill-btn ${activeTab === "selling" ? "active" : ""}`}
            onClick={() => setActiveTab("selling")}
          >
            پرفروش‌ترین‌ها
          </button>
          <button
            type="button"
            className={`analytics-pill-btn ${activeTab === "viewed" ? "active" : ""}`}
            onClick={() => setActiveTab("viewed")}
          >
            پربازدیدترین‌ها
          </button>
        </div>
      </div>

      <div className="admin-table-wrap">
        {activeTab === "selling" ? (
          <table className="admin-table analytics-product-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>رتبه</th>
                <th>محصول</th>
                <th>دسته‌بندی</th>
                <th>تعداد فروخته شده</th>
                <th>مجموع درآمد</th>
                <th>میانگین قیمت</th>
              </tr>
            </thead>
            <tbody>
              {safeSelling.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-empty">
                    داده‌ای برای ۳۰ روز گذشته ثبت نشده است.
                  </td>
                </tr>
              ) : (
                safeSelling.map((p, idx) => (
                  <tr key={p.productId || idx}>
                    <td>
                      <span className={`rank-badge rank-badge--${idx < 3 ? idx + 1 : "default"}`}>
                        {formatNumber(idx + 1)}
                      </span>
                    </td>
                    <td>
                      <div className="analytics-product-cell">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.productName || "محصول"}
                            width={44}
                            height={44}
                            className="analytics-product-thumb"
                          />
                        ) : (
                          <div className="analytics-product-thumb-placeholder">ترمه</div>
                        )}
                        <div>
                          <Link
                            href={`/products/${p.productSlug || ""}`}
                            target="_blank"
                            className="analytics-product-name"
                          >
                            {p.productName || "محصول ترمه"}
                          </Link>
                          <small className="analytics-product-sku">کد: {p.sku || "—"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill">{p.categoryName || "عمومی"}</span>
                    </td>
                    <td>
                      <strong className="analytics-highlight-metric">{formatNumber(p.unitsSold || 0)} عدد</strong>
                    </td>
                    <td>{formatPrice(p.totalRevenue || 0)}</td>
                    <td>{formatPrice(p.averagePrice || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="admin-table analytics-product-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>رتبه</th>
                <th>محصول</th>
                <th>دسته‌بندی</th>
                <th>تعداد بازدید</th>
                <th>سفارشات موفق</th>
                <th>اقلام فروخته شده</th>
                <th>نرخ تبدیل بازدید به خرید</th>
              </tr>
            </thead>
            <tbody>
              {safeViewed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    داده‌ای برای ۳۰ روز گذشته ثبت نشده است.
                  </td>
                </tr>
              ) : (
                safeViewed.map((p, idx) => (
                  <tr key={p.productId || idx}>
                    <td>
                      <span className={`rank-badge rank-badge--${idx < 3 ? idx + 1 : "default"}`}>
                        {formatNumber(idx + 1)}
                      </span>
                    </td>
                    <td>
                      <div className="analytics-product-cell">
                        {p.imageUrl ? (
                          <Image
                            src={p.imageUrl}
                            alt={p.productName || "محصول"}
                            width={44}
                            height={44}
                            className="analytics-product-thumb"
                          />
                        ) : (
                          <div className="analytics-product-thumb-placeholder">ترمه</div>
                        )}
                        <div>
                          <Link
                            href={`/products/${p.productSlug || ""}`}
                            target="_blank"
                            className="analytics-product-name"
                          >
                            {p.productName || "محصول ترمه"}
                          </Link>
                          <small className="analytics-product-sku">کد: {p.sku || "—"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="status-pill">{p.categoryName || "عمومی"}</span>
                    </td>
                    <td>
                      <strong>{formatNumber(p.viewCount || 0)} بازدید</strong>
                    </td>
                    <td>
                      <strong>{formatNumber(p.orderCount || 0)} سفارش</strong>
                    </td>
                    <td>{formatNumber(p.unitsSold || 0)} عدد</td>
                    <td>
                      <div className="conversion-badge-wrap">
                        <span className={`conversion-badge ${(p.conversionRate || 0) >= 5 ? "high" : "normal"}`}>
                          {formatNumber(p.conversionRate || 0)}٪
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function LoyalCustomersSection({
  customers = [],
}: {
  customers?: LoyalCustomer[];
}) {
  const safeCustomers = Array.isArray(customers) ? customers : [];

  return (
    <div className="admin-panel analytics-loyal-panel">
      <div className="admin-panel__heading">
        <div>
          <p className="section-eyebrow">باشگاه وفاداری</p>
          <h2>مشتریان وفادار و برتر</h2>
        </div>
        <span className="status-pill status-pill--success">{formatNumber(safeCustomers.length)} مشتری برتر</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>سطح</th>
              <th>نام مشتری</th>
              <th>شماره تماس</th>
              <th>تعداد سفارش</th>
              <th>مجموع خرید</th>
              <th>میانگین هر سفارش (AOV)</th>
              <th>آخرین سفارش</th>
            </tr>
          </thead>
          <tbody>
            {safeCustomers.length === 0 ? (
              <tr>
                <td colSpan={7} className="admin-empty">
                  هنوز مشتری ثبت شده با سفارش تکمیل شده وجود ندارد.
                </td>
              </tr>
            ) : (
              safeCustomers.map((c, idx) => {
                const tier = (c.loyaltyTier || "برنزی").trim();
                const isVip = tier.includes("VIP");
                const isGold = tier.includes("طلایی");
                const isSilver = tier.includes("نقره");
                return (
                  <tr key={c.customerId || idx}>
                    <td>
                      <span className={`loyalty-tier-badge ${isVip ? "loyalty-tier-badge--vip" : isGold ? "loyalty-tier-badge--gold" : isSilver ? "loyalty-tier-badge--silver" : ""}`}>
                        {isVip && <DiamondIcon className="size-3.5" />}
                        {isGold && <TrophyIcon className="size-3.5" />}
                        {isSilver && <MedalIcon className="size-3.5" />}
                        {!isVip && !isGold && !isSilver && <MedalIcon className="size-3.5" />}
                        <span>{tier}</span>
                      </span>
                    </td>
                    <td>
                      <strong>{c.fullName || "مشتری"}</strong>
                      {c.email && <small>{c.email}</small>}
                    </td>
                    <td dir="ltr" style={{ textAlign: "right" }}>
                      {c.phone || "—"}
                    </td>
                    <td>
                      <strong className="analytics-highlight-metric">{formatNumber(c.orderCount || 0)} سفارش</strong>
                    </td>
                    <td>{formatPrice(c.totalOrderValue || 0)}</td>
                    <td>{formatPrice(c.averageOrderValue || 0)}</td>
                    <td>
                      {c.lastOrderAtUtc ? new Date(c.lastOrderAtUtc).toLocaleDateString("fa-IR") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AbandonedCartsSection({
  abandonedCarts = [],
}: {
  abandonedCarts?: AbandonedCartDetails[];
}) {
  const safeCarts = Array.isArray(abandonedCarts) ? abandonedCarts : [];

  return (
    <div className="admin-panel analytics-abandoned-panel">
      <div className="admin-panel__heading">
        <div>
          <p className="section-eyebrow">فرصت‌های بازیابی فروش</p>
          <h2>سبدهای خرید رها شده و پرداخت‌های ناموفق</h2>
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>نوع</th>
              <th>شناسه / شماره</th>
              <th>مشتری</th>
              <th>تماس</th>
              <th>تعداد اقلام</th>
              <th>ارزش سبد</th>
              <th>زمان ثبت / فعالیت</th>
              <th>اقلام داخل سبد</th>
            </tr>
          </thead>
          <tbody>
            {safeCarts.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-empty">
                  هیچ سبد خرید رها شده‌ای در حال حاضر ثبت نشده است.
                </td>
              </tr>
            ) : (
              safeCarts.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>
                    <span
                      className={`status-pill ${
                        item.isExpiredCheckout ? "status-pill--danger" : "status-pill--warning"
                      }`}
                    >
                      {item.isExpiredCheckout ? "انقضای پرداخت" : "سبد رها شده"}
                    </span>
                  </td>
                  <td>
                    <code className="analytics-code-snippet">{item.sessionKeyOrOrderNumber || "—"}</code>
                  </td>
                  <td>{item.customerName || "کاربر مهمان"}</td>
                  <td dir="ltr" style={{ textAlign: "right" }}>
                    {item.phone || "—"}
                  </td>
                  <td>
                    <strong>{formatNumber(item.itemCount || 0)} عدد</strong>
                  </td>
                  <td>
                    <strong style={{ color: "var(--copper)" }}>{formatPrice(item.totalValue || 0)}</strong>
                  </td>
                  <td>{item.lastActivityAtUtc ? new Date(item.lastActivityAtUtc).toLocaleString("fa-IR") : "—"}</td>
                  <td>
                    <div className="abandoned-items-summary">
                      {(item.items || []).map((i, iIdx) => (
                        <span key={iIdx} className="abandoned-item-tag">
                          {i.productName} ({formatNumber(i.quantity || 1)}×)
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
