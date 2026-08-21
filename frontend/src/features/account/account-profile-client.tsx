"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AccountShell } from "./components/account-shell";
import {
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerProfile,
} from "./account-api";
import { formatPersianDate } from "@/lib/format";
import { ShieldCheckIcon, PhoneIcon, UserIcon, CheckIcon, LightbulbIcon } from "@/components/ui/icons";

export function AccountProfileClient() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCustomerProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.fullName);
        setEmail(data.email || "");
      })
      .catch((err) => setError(err.message || "خطا در دریافت اطلاعات کاربری"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("نام و نام خانوادگی نمی‌تواند خالی باشد.");
      return;
    }

    setSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const updated = await updateCustomerProfile({
        fullName: fullName.trim(),
        email: email.trim() || null,
      });
      setProfile(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطایی در ذخیره اطلاعات رخ داد.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountShell title="اطلاعات حساب کاربری" breadcrumbs={[{ label: "اطلاعات حساب" }]}>
      <div className="account-profile-view">
        {loading ? (
          <div className="cart-loading" role="status">
            در حال بارگذاری اطلاعات حساب…
          </div>
        ) : error && !profile ? (
          <div className="account-error" role="alert">
            {error}
          </div>
        ) : profile ? (
          <div className="profile-cards-stack">
            {/* Personal Details Form */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <UserIcon className="size-5 text-amber-800" />
                <div>
                  <h3>مشخصات فردی</h3>
                  <p>نام و ایمیل خود را می‌توانید در این بخش ویرایش کنید.</p>
                </div>
              </div>

              {saveSuccess && (
                <div className="profile-success-banner" role="status">
                  <CheckIcon className="size-4 text-emerald-600" />
                  <span>اطلاعات حساب کاربری با موفقیت به‌روزرسانی شد.</span>
                </div>
              )}

              {error && <div className="account-error" role="alert">{error}</div>}

              <form onSubmit={handleSaveProfile} className="profile-form">
                <div className="form-grid-2">
                  <label className="form-field">
                    <span>نام و نام خانوادگی *</span>
                    <input
                      type="text"
                      placeholder="نام و نام خانوادگی"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setError("");
                      }}
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span>آدرس ایمیل (اختیاری)</span>
                    <input
                      type="email"
                      dir="ltr"
                      placeholder="example@domain.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                    />
                  </label>
                </div>

                <div className="profile-form-actions">
                  <button type="submit" className="button button--primary" disabled={saving}>
                    {saving ? "در حال ذخیره…" : "ذخیره تغییرات"}
                  </button>
                </div>
              </form>
            </div>

            {/* Mobile Phone Verification Box */}
            <div className="profile-section-card">
              <div className="profile-section-header">
                <PhoneIcon className="size-5 text-amber-800" />
                <div>
                  <h3>شماره موبایل حساب کاربری</h3>
                  <p>شماره موبایل به عنوان شناسه یکتای ورود به حساب و دریافت پیامک‌های سفارش استفاده می‌شود.</p>
                </div>
              </div>

              <div className="profile-phone-box">
                <div className="profile-phone-display">
                  <span className="phone-label">شماره موبایل تأییدشده:</span>
                  <div className="phone-badge-group">
                    <strong dir="ltr" className="phone-number-val">
                      {profile.phone}
                    </strong>
                    <span className="verified-pill">
                      <ShieldCheckIcon className="size-4" />
                      <span>تأیید شده</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="profile-phone-notice">
                <span className="notice-icon"><LightbulbIcon className="size-4" /></span>
                <p>
                  شماره موبایل شناسه اصلی حساب کاربری شماست و امکان تغییر آن وجود ندارد. تمامی سفارش‌ها و آدرس‌های شما با این شماره ثبت می‌شوند.
                </p>
              </div>
            </div>

            {/* Account Metadata Overview */}
            <div className="profile-section-card profile-meta-card">
              <div className="profile-meta-grid">
                <div>
                  <span className="meta-label">تاریخ عضویت:</span>
                  <strong>
                    {formatPersianDate(profile.createdAt, { includeWeekday: false })}
                  </strong>
                </div>
                <div>
                  <span className="meta-label">تعداد کل سفارش‌ها:</span>
                  <strong>{profile.orderCount.toLocaleString("fa-IR")} سفارش</strong>
                </div>
                <div>
                  <span className="meta-label">کالاهای نشان‌شده:</span>
                  <strong>{profile.wishlistCount.toLocaleString("fa-IR")} کالا</strong>
                </div>
                <div>
                  <span className="meta-label">آدرس‌های ثبت‌شده:</span>
                  <strong>{profile.addressCount.toLocaleString("fa-IR")} آدرس</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AccountShell>
  );
}
