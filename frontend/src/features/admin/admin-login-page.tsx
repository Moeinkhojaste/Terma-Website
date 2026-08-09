"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { loginAdmin } from "@/features/admin/auth-api";

type AdminLoginPageProps = {
  sessionMessage?: boolean;
};

export function AdminLoginPage({ sessionMessage = false }: AdminLoginPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setPending(true);

    const form = new FormData(event.currentTarget);
    try {
      await loginAdmin(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError("ایمیل یا رمز عبور درست نیست.");
      } else if (caught instanceof ApiError && caught.status === 423) {
        setError("به‌دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. کمی بعد دوباره تلاش کنید.");
      } else if (caught instanceof ApiError && caught.isNetworkError) {
        setError("ارتباط با سرور برقرار نشد. اتصال اینترنت و اجرای backend را بررسی کنید.");
      } else {
        setError("ورود انجام نشد. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-login-title">
        <p className="section-eyebrow">مدیریت ترما</p>
        <h1 id="admin-login-title">ورود مدیر</h1>
        <p className="admin-auth-card__intro">برای دسترسی به بخش مدیریت، ایمیل و رمز حساب مدیر را وارد کنید.</p>

        {sessionMessage && (
          <p className="admin-auth-message admin-auth-message--notice" role="status">
            نشست شما منقضی شده یا وارد حساب نشده‌اید.
          </p>
        )}
        {error && <p className="admin-auth-message admin-auth-message--error" role="alert">{error}</p>}

        <form className="admin-auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            ایمیل
            <input name="email" type="email" autoComplete="username" required disabled={pending} />
          </label>
          <label className="form-field">
            رمز عبور
            <input name="password" type="password" autoComplete="current-password" required disabled={pending} />
          </label>
          <button className="button button--primary admin-auth-submit" type="submit" disabled={pending}>
            {pending && <span className="button-spinner" aria-hidden="true" />}
            {pending ? "در حال ورود…" : "ورود به حساب"}
          </button>
        </form>

        <Link className="admin-auth-back" href="/">بازگشت به فروشگاه</Link>
      </section>
    </main>
  );
}
