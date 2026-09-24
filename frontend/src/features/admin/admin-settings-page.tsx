"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { getAdminSession, logoutAdmin, type AdminSession } from "@/features/admin/auth-api";
import { apiRequest, ApiError, getApiErrorMessage } from "@/lib/api-client";

type StoreSettings = {
  reservationHours: number;
  lowStockDefaultThreshold: number;
  currency: string;
  giftPackagingPrice: number;
  isGiftPackagingEnabled: boolean;
};

export function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<AdminSession>();
  const [settings, setSettings] = useState<StoreSettings>();
  const [error, setError] = useState<string>();

  const [giftPriceInput, setGiftPriceInput] = useState<number>(200000);
  const [giftEnabledInput, setGiftEnabledInput] = useState<boolean>(true);
  const [savingPackaging, setSavingPackaging] = useState(false);
  const [packagingSavedMessage, setPackagingSavedMessage] = useState<string | null>(null);
  const [packagingError, setPackagingError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAdminSession(), apiRequest<StoreSettings>("/api/admin/settings", { cache: "no-store" })])
      .then(([account, store]) => {
        setSession(account);
        setSettings(store);
        if (store) {
          setGiftPriceInput(store.giftPackagingPrice ?? 200000);
          setGiftEnabledInput(store.isGiftPackagingEnabled ?? true);
        }
      })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 401) router.replace("/admin/login?reason=expired");
        else setError(getApiErrorMessage(caught));
      });
  }, [router]);

  async function logout() { await logoutAdmin(); router.replace("/admin/login"); }

  async function handleSavePackaging(e: FormEvent) {
    e.preventDefault();
    setSavingPackaging(true);
    setPackagingSavedMessage(null);
    setPackagingError(null);
    try {
      const updated = await apiRequest<StoreSettings>("/api/admin/settings/packaging", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          giftPackagingPrice: Number(giftPriceInput),
          isGiftPackagingEnabled: giftEnabledInput,
        }),
      });
      setSettings(updated);
      setGiftPriceInput(updated.giftPackagingPrice);
      setGiftEnabledInput(updated.isGiftPackagingEnabled);
      setPackagingSavedMessage("تنظیمات بسته‌بندی با موفقیت ذخیره شد.");
    } catch (caught) {
      setPackagingError(getApiErrorMessage(caught));
    } finally {
      setSavingPackaging(false);
    }
  }

  return (
    <AdminShell title="تنظیمات">
      {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
      <div className="admin-settings-grid">
        <section className="admin-panel">
          <p className="section-eyebrow">سفارشی‌سازی و خدمات</p>
          <h2>تنظیمات بسته‌بندی کادویی</h2>
          {packagingSavedMessage && (
            <div className="p-3 mb-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-sm font-medium" role="status">
              ✓ {packagingSavedMessage}
            </div>
          )}
          {packagingError && (
            <div className="admin-alert admin-alert--error" role="alert">
              {packagingError}
            </div>
          )}
          <form onSubmit={handleSavePackaging} className="admin-form" style={{ marginTop: "1rem" }}>
            <label className="form-field">
              <span>هزینه بسته‌بندی کادویی داخل جعبه (تومان)</span>
              <input
                type="number"
                min="0"
                step="1000"
                value={giftPriceInput}
                onChange={(e) => setGiftPriceInput(Number(e.target.value))}
                required
              />
            </label>
            <label className="form-field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={giftEnabledInput}
                onChange={(e) => setGiftEnabledInput(e.target.checked)}
                style={{ width: "1.25rem", height: "1.25rem", accentColor: "var(--teal)" }}
              />
              <span style={{ fontWeight: 600 }}>فعال‌بودن انتخاب بسته‌بندی کادویی در فروشگاه</span>
            </label>
            <p className="admin-muted" style={{ fontSize: "0.8rem", margin: "0.25rem 0 1rem 0" }}>
              در صورت اتمام موجودی فیزیکی جعبه‌های کادویی در انبار، با برداشتن تیک بالا، گزینه کادویی در صفحه محصول غیرفعال می‌گردد.
            </p>
            <button className="button button--primary" type="submit" disabled={savingPackaging}>
              {savingPackaging ? "در حال ذخیره…" : "ذخیره تنظیمات بسته‌بندی"}
            </button>
          </form>
        </section>

        <section className="admin-panel">
          <p className="section-eyebrow">فروشگاه</p>
          <h2>تنظیمات عملیاتی</h2>
          {settings ? (
            <dl className="admin-session-details">
              <div><dt>واحد پول</dt><dd>{settings.currency}</dd></div>
              <div><dt>مدت رزرو موجودی</dt><dd>{settings.reservationHours} ساعت</dd></div>
              <div><dt>آستانه هشدار کمبود</dt><dd>{settings.lowStockDefaultThreshold} عدد</dd></div>
              <div><dt>هزینه کادویی جاری</dt><dd>{new Intl.NumberFormat("fa-IR").format(settings.giftPackagingPrice)} تومان</dd></div>
              <div><dt>وضعیت بسته‌بندی کادویی</dt><dd>{settings.isGiftPackagingEnabled ? "فعال" : "غیرفعال"}</dd></div>
            </dl>
          ) : (
            <p role="status">در حال دریافت تنظیمات…</p>
          )}
          <p className="admin-muted">مدت رزرو و آستانه هشدار کمبود از فایل پیکربندی Backend خوانده می‌شوند.</p>
        </section>

        <section className="admin-panel">
          <p className="section-eyebrow">نشست مدیر</p>
          <h2>حساب فعال</h2>
          {session && (
            <dl className="admin-session-details">
              <div><dt>ایمیل</dt><dd dir="ltr">{session.email}</dd></div>
              <div><dt>نقش</dt><dd>{session.role === "Admin" ? "مدیر" : session.role}</dd></div>
              <div><dt>انقضای نشست</dt><dd>{new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(session.expiresAtUtc))}</dd></div>
            </dl>
          )}
          <button className="button button--primary" type="button" onClick={logout}>خروج از حساب</button>
        </section>
      </div>
    </AdminShell>
  );
}
