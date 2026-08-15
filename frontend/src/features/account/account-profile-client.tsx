"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AccountShell } from "./components/account-shell";
import { ChangePhoneModal } from "./components/change-phone-modal";
import {
  getCustomerProfile,
  updateCustomerProfile,
  type CustomerProfile,
} from "./account-api";
import { ShieldCheckIcon, PhoneIcon, UserIcon, CheckIcon } from "@/components/ui/icons";

export function AccountProfileClient() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);

  const loadProfile = () => {
    setLoading(true);
    getCustomerProfile()
      .then((data) => {
        setProfile(data);
        setFullName(data.fullName);
        setEmail(data.email || "");
      })
      .catch((err) => setError(err.message || "خطا در دریافت اطلاعات کاربری"))
      .finally(() => setLoading(false));
  };

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

  function handlePhoneChanged() {
    loadProfile();
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
                  <h3>شماره موبایل و احراز هویت</h3>
                  <p>شماره موبایل جهت ورود به حساب و دریافت پیامک‌های وضعیت سفارش استفاده می‌شود.</p>
                </div>
              </div>

              <div className="profile-phone-box">
                <div className="profile-phone-display">
                  <span className="phone-label">شماره موبایل فعلی:</span>
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

                <div className="profile-phone-action">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => setPhoneModalOpen(true)}
                  >
                    تغییر شماره موبایل با تأیید پیامکی
                  </button>
                </div>
              </div>

              <div className="profile-phone-notice">
                <span>💡</span>
                <p>
                  برای تغییر شماره موبایل، کد تأیید ۶ رقمی به شماره جدید ارسال خواهد شد و پس از تأیید، شماره به عنوان شناسه حساب شما ثبت می‌گردد.
                </p>
              </div>
            </div>

            {/* Account Metadata Overview */}
            <div className="profile-section-card profile-meta-card">
              <div className="profile-meta-grid">
                <div>
                  <span className="meta-label">تاریخ عضویت:</span>
                  <strong>
                    {new Intl.DateTimeFormat("fa-IR", { dateStyle: "long" }).format(
                      new Date(profile.createdAt)
                    )}
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

      <ChangePhoneModal
        isOpen={phoneModalOpen}
        currentPhone={profile?.phone || ""}
        onClose={() => setPhoneModalOpen(false)}
        onSuccess={handlePhoneChanged}
      />
    </AccountShell>
  );
}
