"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { getAdminSession, logoutAdmin, type AdminSession } from "@/features/admin/auth-api";
import { apiRequest, ApiError, getApiErrorMessage } from "@/lib/api-client";

type StoreSettings = { reservationHours: number; lowStockDefaultThreshold: number; currency: string };

export function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession>();
  const [settings, setSettings] = useState<StoreSettings>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([getAdminSession(), apiRequest<StoreSettings>("/api/admin/settings", { cache: "no-store" })])
      .then(([account, store]) => { setSession(account); setSettings(store); })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 401) router.replace("/admin/login?reason=expired");
        else setError(getApiErrorMessage(caught));
      });
  }, [router]);

  async function logout() { await logoutAdmin(); router.replace("/admin/login"); }

  return <AdminShell title="تنظیمات">
    {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
    <div className="admin-settings-grid">
      <section className="admin-panel"><p className="section-eyebrow">فروشگاه</p><h2>تنظیمات عملیاتی</h2>
        {settings ? <dl className="admin-session-details"><div><dt>واحد پول</dt><dd>{settings.currency}</dd></div><div><dt>مدت رزرو موجودی</dt><dd>{settings.reservationHours} ساعت</dd></div><div><dt>آستانه هشدار کمبود</dt><dd>{settings.lowStockDefaultThreshold} عدد</dd></div></dl> : <p role="status">در حال دریافت تنظیمات…</p>}
        <p className="admin-muted">این مقادیر از تنظیمات امن Backend خوانده می‌شوند و برای تغییر آن‌ها باید پیکربندی محیط اجرا به‌روزرسانی شود.</p>
      </section>
      <section className="admin-panel"><p className="section-eyebrow">نشست مدیر</p><h2>حساب فعال</h2>
        {session && <dl className="admin-session-details"><div><dt>ایمیل</dt><dd dir="ltr">{session.email}</dd></div><div><dt>نقش</dt><dd>{session.role === "Admin" ? "مدیر" : session.role}</dd></div><div><dt>انقضای نشست</dt><dd>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAtUtc))}</dd></div></dl>}
        <button className="button button--primary" type="button" onClick={logout}>خروج از حساب</button>
      </section>
    </div>
  </AdminShell>;
}
