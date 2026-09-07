"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { requestOtp, verifyOtp, type OtpChallenge } from "./account-api";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";
import {
  PhoneIcon,
  ShieldCheckIcon,
  EditIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  LockIcon,
} from "@/components/ui/icons";

export function AccountLoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");

  // OTP Resend Timer
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (challenge && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [challenge, countdown]);

  useEffect(() => {
    if (challenge) {
      codeInputRef.current?.focus();
    }
  }, [challenge]);

  function validatePhone(value: string) {
    if (!value.trim()) return "لطفاً شماره موبایل خود را وارد کنید.";
    if (!normalizeIranianMobile(value)) {
      return "شماره موبایل نامعتبر است. نمونه: ۰۹۱۲۳۴۵۶۷۸۹ یا ۹۸۹۱۲۳۴۵۶۷۸۹+";
    }
    return "";
  }

  function validateCode(value: string) {
    if (!value.trim()) return "لطفاً کد تأیید را وارد کنید.";
    if (!/^\d{6}$/.test(normalizeNumericText(value))) {
      return "کد تأیید باید دقیقاً ۶ رقم باشد.";
    }
    return "";
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    const validationError = validatePhone(phone);
    setPhoneError(validationError);
    if (validationError) return;

    setBusy(true);
    setError("");
    try {
      const normalizedPhone = normalizeIranianMobile(phone)!;
      const res = await requestOtp(normalizedPhone);
      setChallenge(res);
      setCountdown(res.retryAfterSeconds || 60);
      setCanResend(false);
      setCode("");
      setCodeError("");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleResendOtp() {
    if (!canResend || busy) return;
    const validationError = validatePhone(phone);
    if (validationError) return;

    setBusy(true);
    setError("");
    try {
      const normalizedPhone = normalizeIranianMobile(phone)!;
      const res = await requestOtp(normalizedPhone);
      setChallenge(res);
      setCountdown(res.retryAfterSeconds || 60);
      setCanResend(false);
      setCode("");
      setCodeError("");
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (!challenge) return;

    const validationError = validateCode(code);
    setCodeError(validationError);
    if (validationError) return;

    setBusy(true);
    setError("");
    try {
      await verifyOtp(challenge.challengeId, normalizeNumericText(code));
      const targetUrl =
        returnUrl && returnUrl.startsWith("/") && !returnUrl.startsWith("//")
          ? returnUrl
          : "/account";
      router.replace(targetUrl);
      router.refresh();
    } catch (caught) {
      setError(accountErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function handleBackToPhone() {
    setChallenge(undefined);
    setCode("");
    setCodeError("");
    setError("");
  }

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const minsStr = mins < 10 ? `۰${mins}` : `${mins}`;
    const secsStr = secs < 10 ? `۰${secs}` : `${secs}`;
    return `${minsStr}:${secsStr}`;
  };

  return (
    <>
      <main className="commerce-page account-auth-page">
        <Container>
          <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link>
            <span>/</span>
            <span>ورود به حساب</span>
          </nav>

          <div className="account-auth-wrapper">
            <section className="account-auth-card" aria-labelledby="account-login-title">
              {/* Header Icon / Branding */}
              <div className="account-auth-brand-badge">
                <div className="account-auth-icon-wrap">
                  {!challenge ? (
                    <PhoneIcon className="size-6 text-teal-700" />
                  ) : (
                    <LockIcon className="size-6 text-teal-700" />
                  )}
                </div>
              </div>

              <div className="account-auth-header">
                <p className="account-auth-eyebrow">
                  {!challenge ? "ورود یا عضویت" : "تأیید شماره تماس"}
                </p>
                <h1 id="account-login-title" className="account-auth-title">
                  {!challenge ? "ورود به حساب کاربری" : "کد تأیید را وارد کنید"}
                </h1>
                <p className="account-auth-subtitle">
                  {!challenge
                    ? "برای پیگیری سفارش‌ها، دسترسی به سوابق خرید و مدیریت حساب کاربری، شماره موبایل خود را وارد نمایید."
                    : "کد تأیید ۶ رقمی پیامک‌شده را در کادر زیر وارد کنید."}
                </p>
              </div>

              {!challenge ? (
                /* Step 1: Phone Number */
                <form onSubmit={handleSendOtp} className="account-auth-form" noValidate>
                  <div className="form-field">
                    <label htmlFor="auth-phone-input" className="form-field__label">
                      <span>شماره موبایل</span>
                    </label>
                    <div className="account-input-group">
                      <input
                        id="auth-phone-input"
                        value={phone}
                        onChange={(event) => {
                          setPhone(event.target.value);
                          if (phoneError) setPhoneError(validatePhone(event.target.value));
                          if (error) setError("");
                        }}
                        onBlur={() => setPhoneError(validatePhone(phone))}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                        className={`account-phone-input ${phoneError ? "account-input--error" : ""}`}
                        aria-invalid={Boolean(phoneError)}
                        aria-describedby={phoneError ? "account-phone-error" : undefined}
                        dir="ltr"
                      />
                      <span className="account-input-prefix">+۹۸</span>
                    </div>
                    {phoneError && (
                      <small id="account-phone-error" className="form-field__error" role="alert">
                        {phoneError}
                      </small>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="button button--primary account-auth-submit-btn"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span className="button-spinner" />
                        در حال ارسال کد…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        دریافت کد ورود
                        <ArrowLeftIcon className="size-4" />
                      </span>
                    )}
                  </button>

                  <div className="account-auth-trust-note">
                    <ShieldCheckIcon className="size-4 text-emerald-600 shrink-0" />
                    <span>ورود امن و سریع با کد یکبار مصرف پیامکی</span>
                  </div>

                  <p className="account-auth-terms-note">
                    با ورود یا ثبت‌نام در ترما،{" "}
                    <Link href="/terms" className="text-link-subtle">
                      شرایط و قوانین
                    </Link>{" "}
                    و{" "}
                    <Link href="/privacy" className="text-link-subtle">
                      حریم خصوصی
                    </Link>{" "}
                    را می‌پذیرید.
                  </p>
                </form>
              ) : (
                /* Step 2: OTP Verification */
                <form onSubmit={handleVerifyOtp} className="account-auth-form" noValidate>
                  {/* Phone Preview & Edit */}
                  <div className="account-phone-preview-card">
                    <div className="account-phone-preview-info">
                      <span className="account-phone-preview-label">ارسال کد به:</span>
                      <strong className="account-phone-preview-number" dir="ltr">
                        {phone}
                      </strong>
                    </div>
                    <button
                      type="button"
                      onClick={handleBackToPhone}
                      className="account-phone-edit-btn"
                      title="ویرایش شماره موبایل"
                    >
                      <EditIcon className="size-3.5" />
                      <span>ویرایش شماره</span>
                    </button>
                  </div>

                  <div className="form-field">
                    <label htmlFor="auth-code-input" className="form-field__label">
                      <span>کد تأیید</span>
                    </label>
                    <input
                      id="auth-code-input"
                      ref={codeInputRef}
                      value={code}
                      onChange={(event) => {
                        setCode(event.target.value);
                        if (codeError) setCodeError(validateCode(event.target.value));
                        if (error) setError("");
                      }}
                      onBlur={() => setCodeError(validateCode(code))}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="— — — — — —"
                      className={`account-otp-input ${codeError ? "account-input--error" : ""}`}
                      aria-invalid={Boolean(codeError)}
                      aria-describedby={codeError ? "account-code-error" : undefined}
                      dir="ltr"
                    />
                    {codeError && (
                      <small id="account-code-error" className="form-field__error" role="alert">
                        {codeError}
                      </small>
                    )}
                  </div>

                  {/* Countdown Timer / Resend */}
                  <div className="account-auth-resend-box">
                    {!canResend ? (
                      <span className="account-resend-timer">
                        ارسال مجدد کد تا{" "}
                        <strong className="text-teal-900 font-bold" dir="ltr">
                          {formatCountdown(countdown)}
                        </strong>{" "}
                        دیگر
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={busy}
                        className="account-resend-btn"
                      >
                        <RefreshCwIcon className="size-3.5" />
                        <span>ارسال مجدد کد تأیید</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="button button--primary account-auth-submit-btn"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="flex items-center gap-2">
                        <span className="button-spinner" />
                        در حال بررسی…
                      </span>
                    ) : (
                      "ورود به حساب"
                    )}
                  </button>

                  <button
                    type="button"
                    className="button button--secondary account-auth-back-btn"
                    onClick={handleBackToPhone}
                  >
                    تغییر شماره موبایل
                  </button>
                </form>
              )}

              {error && (
                <div className="account-error account-auth-error-banner" role="alert">
                  {error}
                </div>
              )}
            </section>
          </div>
        </Container>
      </main>
    </>
  );
}

function accountErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.isNetworkError) return "ارتباط با سرویس برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید.";
    if (error.status === 410) return "زمان اعتبار کد تأیید به پایان رسیده است. لطفاً کد جدید دریافت کنید.";
    if (error.status === 429) return "تعداد درخواست‌های شما بیش از حد مجاز بوده است. لطفاً چند دقیقه صبر کرده و مجدداً تلاش کنید.";
    if (error.status === 409) return "این کد تأیید قبلاً استفاده شده است. لطفاً یک کد جدید درخواست کنید.";
    return getApiErrorMessage(error);
  }
  return getApiErrorMessage(error);
}
