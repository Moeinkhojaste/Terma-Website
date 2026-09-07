"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import {
  confirmAdminPasswordReset,
  loginAdmin,
  requestAdminPasswordReset,
  type AdminPasswordResetResponse,
} from "@/features/admin/auth-api";

type AdminLoginPageProps = {
  sessionMessage?: boolean;
};

type ViewMode = "login" | "reset-request" | "reset-confirm";

export function AdminLoginPage({ sessionMessage = false }: AdminLoginPageProps) {
  const router = useRouter();

  const [mode, setMode] = useState<ViewMode>("login");
  const [email, setEmail] = useState("admin@termabrand.ir");
  const [password, setPassword] = useState("");

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [challenge, setChallenge] = useState<AdminPasswordResetResponse | null>(null);
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);

    try {
      await loginAdmin(email.trim(), password);
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

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);
    setPending(true);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setError("لطفاً آدرس ایمیل مدیر را وارد کنید.");
      setPending(false);
      return;
    }

    try {
      const res = await requestAdminPasswordReset(targetEmail);
      setChallenge(res);
      setCountdown(res.expiresInSeconds || 120);
      setCode(res.developmentCode ?? "");
      setMode("reset-confirm");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError("تعداد درخواست‌ها بیش از حد مجاز است. لطفاً چند دقیقه صبر کنید.");
      } else if (caught instanceof ApiError && caught.status === 400) {
        setError(caught.message || "امکان ارسال کد به این ایمیل وجود ندارد.");
      } else if (caught instanceof ApiError && caught.isNetworkError) {
        setError("ارتباط با سرور برقرار نشد. لطفاً وضعیت اینترنت را بررسی کنید.");
      } else {
        setError("خطا در ارسال کد تأیید. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0 || pending) return;
    setError(undefined);
    setPending(true);

    try {
      const res = await requestAdminPasswordReset(email.trim());
      setChallenge(res);
      setCountdown(res.expiresInSeconds || 120);
      setCode(res.developmentCode ?? "");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 429) {
        setError("تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.");
      } else {
        setError("خطا در ارسال مجدد کد تأیید.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleConfirmReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);

    if (!challenge?.challengeId) {
      setError("شناسه درخواست نامعتبر است. لطفاً مجدداً درخواست کد دهید.");
      return;
    }

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setError("کد تأیید باید ۶ رقم باشد.");
      return;
    }

    if (newPassword.length < 12) {
      setError("رمز عبور جدید باید حداقل ۱۲ کاراکتر باشد.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("رمز عبور جدید و تکرار آن یکسان نیستند.");
      return;
    }

    setPending(true);
    try {
      await confirmAdminPasswordReset(challenge.challengeId, cleanCode, newPassword, confirmPassword);
      setSuccess("رمز عبور با موفقیت تغییر یافت. لطفاً با رمز عبور جدید وارد شوید.");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setCode("");
      setChallenge(null);
      setMode("login");
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setError(caught.message || "کد تأیید نامعتبر یا منقضی شده است.");
      } else if (caught instanceof ApiError && caught.status === 429) {
        setError("تعداد تلاش‌های ناموفق بیش از حد مجاز است.");
      } else if (caught instanceof ApiError && caught.isNetworkError) {
        setError("ارتباط با سرور برقرار نشد.");
      } else {
        setError("خطا در تغییر رمز عبور. لطفاً مجدداً تلاش کنید.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <section className="admin-auth-card" aria-labelledby="admin-auth-title">
        <p className="section-eyebrow">مدیریت ترما</p>

        {mode === "login" && (
          <>
            <h1 id="admin-auth-title">ورود مدیر</h1>
            <p className="admin-auth-card__intro">
              برای دسترسی به بخش مدیریت، ایمیل و رمز حساب مدیر را وارد کنید.
            </p>

            {sessionMessage && (
              <p className="admin-auth-message admin-auth-message--notice" role="status">
                نشست شما منقضی شده یا وارد حساب نشده‌اید.
              </p>
            )}
            {success && (
              <p className="admin-auth-message admin-auth-message--success" role="status">
                {success}
              </p>
            )}
            {error && (
              <p className="admin-auth-message admin-auth-message--error" role="alert">
                {error}
              </p>
            )}

            <form className="admin-auth-form" onSubmit={handleLogin}>
              <label className="form-field">
                ایمیل
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending}
                />
              </label>

              <label className="form-field">
                رمز عبور
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={pending}
                />
              </label>

              <div className="admin-auth-helper">
                <button
                  type="button"
                  className="admin-auth-link-btn"
                  onClick={() => {
                    setError(undefined);
                    setSuccess(undefined);
                    setMode("reset-request");
                  }}
                  disabled={pending}
                >
                  فراموشی یا تغییر رمز عبور؟
                </button>
              </div>

              <button className="button button--primary admin-auth-submit" type="submit" disabled={pending}>
                {pending && <span className="button-spinner" aria-hidden="true" />}
                {pending ? "در حال ورود…" : "ورود به حساب"}
              </button>
            </form>

            <Link className="admin-auth-back" href="/">بازگشت به فروشگاه</Link>
          </>
        )}

        {mode === "reset-request" && (
          <>
            <h1 id="admin-auth-title">تغییر رمز عبور</h1>
            <p className="admin-auth-card__intro">
              کد تأیید یک‌بارمصرف جهت تغییر رمز به آدرس ایمیل مدیر ارسال می‌شود.
            </p>

            {error && (
              <p className="admin-auth-message admin-auth-message--error" role="alert">
                {error}
              </p>
            )}

            <form className="admin-auth-form" onSubmit={handleRequestReset}>
              <label className="form-field">
                ایمیل حساب مدیر
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={pending}
                />
              </label>

              <button className="button button--primary admin-auth-submit" type="submit" disabled={pending}>
                {pending && <span className="button-spinner" aria-hidden="true" />}
                {pending ? "در حال ارسال کد…" : "ارسال کد تأیید به ایمیل"}
              </button>
            </form>

            <button
              type="button"
              className="admin-auth-back"
              onClick={() => {
                setError(undefined);
                setMode("login");
              }}
              disabled={pending}
            >
              بازگشت به صفحه ورود
            </button>
          </>
        )}

        {mode === "reset-confirm" && (
          <>
            <h1 id="admin-auth-title">تأیید کد و تغییر رمز</h1>
            <p className="admin-auth-card__intro">
              کد ارسال‌شده به <strong>{email}</strong> را وارد نموده و رمز جدید خود را تعیین کنید.
            </p>

            {error && (
              <p className="admin-auth-message admin-auth-message--error" role="alert">
                {error}
              </p>
            )}

            {challenge?.developmentCode && (
              <div className="admin-auth-message admin-auth-message--notice" role="status">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>کد موقت محیط توسعه:</span>
                  <strong dir="ltr">{challenge.developmentCode}</strong>
                </div>
                <button
                  type="button"
                  className="admin-auth-link-btn"
                  style={{ marginTop: "0.35rem" }}
                  onClick={() => setCode(challenge.developmentCode!)}
                >
                  درج خودکار کد
                </button>
              </div>
            )}

            <form className="admin-auth-form" onSubmit={handleConfirmReset}>
              <label className="form-field">
                کد تأیید ۶ رقمی
                <input
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  dir="ltr"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  disabled={pending}
                />
              </label>

              <label className="form-field">
                رمز عبور جدید (حداقل ۱۲ کاراکتر)
                <input
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={pending}
                />
              </label>

              <label className="form-field">
                تکرار رمز عبور جدید
                <input
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={pending}
                />
              </label>

              <div className="admin-auth-helper">
                {countdown > 0 ? (
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                    ارسال مجدد کد تا {countdown} ثانیه دیگر
                  </span>
                ) : (
                  <button
                    type="button"
                    className="admin-auth-link-btn"
                    onClick={handleResendCode}
                    disabled={pending}
                  >
                    ارسال مجدد کد تأیید
                  </button>
                )}
              </div>

              <button className="button button--primary admin-auth-submit" type="submit" disabled={pending}>
                {pending && <span className="button-spinner" aria-hidden="true" />}
                {pending ? "در حال ثبت…" : "تغییر رمز عبور"}
              </button>
            </form>

            <button
              type="button"
              className="admin-auth-back"
              onClick={() => {
                setError(undefined);
                setMode("login");
              }}
              disabled={pending}
            >
              انصراف و بازگشت به صفحه ورود
            </button>
          </>
        )}
      </section>
    </main>
  );
}
