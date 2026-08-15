"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { getDashboard, type Dashboard } from "@/features/admin/store-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";

export function AdminDashboardPage() {
  const [data, setData] = useState<Dashboard>();
  const [error, setError] = useState<string>();
  useEffect(() => { getDashboard().then(setData).catch((caught) => setError(getApiErrorMessage(caught))); }, []);
  return <AdminShell title="داشبورد">
    {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
    {!data && !error ? <div className="admin-panel" role="status">در حال دریافت آمار فروشگاه…</div> : data && <>
      <section className="admin-stat-grid" aria-label="آمار اصلی">
        <Stat label="محصول فعال" value={data.productCount} href="/admin/products" />
        <Stat label="سفارش در انتظار بررسی" value={data.pendingOrderCount} href="/admin/orders" tone={data.pendingOrderCount ? "warning" : undefined} />
        <Stat label="موجودی کم" value={data.lowStockCount} href="/admin/products" tone={data.lowStockCount ? "danger" : undefined} />
        <Stat label="مشتری مهمان" value={data.customerCount} href="/admin/customers" />
        <Stat label="پیام خوانده‌نشده" value={data.unreadMessageCount} href="/admin/messages" />
        <Stat label="ارزش سفارش‌ها" value={formatPrice(data.orderValue)} href="/admin/orders" />
      </section>
      <section className="admin-panel admin-quick-actions"><div className="admin-panel__heading"><div><p className="section-eyebrow">دسترسی سریع</p><h2>کارهای امروز</h2></div></div><div className="admin-action-grid"><Link href="/admin/products?new=1" className="admin-action-card"><strong>افزودن محصول</strong><span>ساخت محصول و تنوع جدید</span></Link><Link href="/admin/orders" className="admin-action-card"><strong>بررسی سفارش‌ها</strong><span>مشاهده و تغییر وضعیت سفارش</span></Link><Link href="/admin/content" className="admin-action-card"><strong>ویرایش سایت</strong><span>تغییر متن‌ها و تصاویر محتوایی</span></Link><Link href="/admin/messages" className="admin-action-card"><strong>پاسخ به پیام‌ها</strong><span>صندوق پیام مشتریان</span></Link></div></section>
    </>}
  </AdminShell>;
}

function Stat({ label, value, href, tone }: { label: string; value: string | number; href: string; tone?: "warning" | "danger" }) { return <Link href={href} className={`admin-stat-card${tone ? ` admin-stat-card--${tone}` : ""}`}><span>{label}</span><strong>{value}</strong><small>مشاهده جزئیات ←</small></Link>; }
