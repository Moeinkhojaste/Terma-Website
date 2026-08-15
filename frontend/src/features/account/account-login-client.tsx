"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { ApiError } from "@/lib/api-client";
import { requestOtp, verifyOtp, type OtpChallenge } from "./account-api";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";

export function AccountLoginClient() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");

  function validatePhone(value: string) {
    if (!value.trim()) return "شماره موبایل را وارد کنید.";
    if (!normalizeIranianMobile(value)) return "شماره را مانند ۰۹۱۲...، +۹۸۹۱۲... یا ۰۰۹۸۹۱۲... وارد کنید.";
    return "";
  }

  function validateCode(value: string) {
    if (!value.trim()) return "کد تأیید را وارد کنید.";
    if (!/^\d{6}$/.test(normalizeNumericText(value))) return "کد تأیید باید ۶ رقم باشد.";
    return "";
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const validationError = validatePhone(phone);
    setPhoneError(validationError);
    if (validationError) return;
    setBusy(true); setError("");
    try { setChallenge(await requestOtp(normalizeIranianMobile(phone)!)); }
    catch (caught) { setError(accountErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); if (!challenge) return;
    const validationError = validateCode(code);
    setCodeError(validationError);
    if (validationError) return;
    setBusy(true); setError("");
    try { await verifyOtp(challenge.challengeId, normalizeNumericText(code)); router.replace("/account"); router.refresh(); }
    catch (caught) { setError(accountErrorMessage(caught)); }
    finally { setBusy(false); }
  }

  return <><Header /><main className="commerce-page account-page"><Container>
    <nav className="breadcrumbs commerce-breadcrumbs" aria-label="مسیر صفحه"><Link href="/">خانه</Link><span>/</span><span>ورود به حساب</span></nav>
    <section className="account-auth-card" aria-labelledby="account-login-title">
      <p className="section-eyebrow">حساب مشتری</p><h1 id="account-login-title">ورود با شماره موبایل</h1>
      <p>برای دیدن سفارش‌های قبلی، شماره موبایل خود را وارد کنید.</p>
      {!challenge ? <form onSubmit={send} className="account-form">
        <label className="form-field"><span>شماره موبایل</span><input value={phone} onChange={event => { setPhone(event.target.value); setPhoneError(validatePhone(event.target.value)); setError(""); }} onBlur={() => setPhoneError(validatePhone(phone))} type="tel" inputMode="tel" autoComplete="tel" placeholder="۰۹۱۲... یا +۹۸۹۱۲..." aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? "account-phone-error" : undefined} />{phoneError && <small id="account-phone-error" className="form-field__error" role="alert">{phoneError}</small>}</label>
        <button className="button button--primary" disabled={busy}>{busy ? "در حال ساخت کد…" : "دریافت کد ورود"}</button>
      </form> : <form onSubmit={verify} className="account-form">
        <p>کد شش‌رقمی ارسال‌شده برای <b dir="ltr">{phone}</b> را وارد کنید.</p>
        {challenge.developmentCode && <div className="development-otp" role="status">کد موقت نسخه توسعه: <strong dir="ltr">{challenge.developmentCode}</strong></div>}
        <label className="form-field"><span>کد تأیید</span><input value={code} onChange={event => { setCode(event.target.value); setCodeError(validateCode(event.target.value)); setError(""); }} onBlur={() => setCodeError(validateCode(code))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={Boolean(codeError)} aria-describedby={codeError ? "account-code-error" : undefined} />{codeError && <small id="account-code-error" className="form-field__error" role="alert">{codeError}</small>}</label>
        <button className="button button--primary" disabled={busy}>{busy ? "در حال بررسی…" : "ورود به حساب"}</button>
        <button type="button" className="text-link" onClick={() => { setChallenge(undefined); setCode(""); setCodeError(""); setError(""); }}>تغییر شماره موبایل</button>
      </form>}
      {error && <div className="account-error" role="alert">{error}</div>}
    </section>
  </Container></main><Footer /></>;
}

function accountErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.";
  if (error.isNetworkError) return "ارتباط با سرویس برقرار نشد. اتصال اینترنت و اجرای API را بررسی کنید.";
  if (error.status === 410) return "زمان استفاده از کد تمام شده است. یک کد جدید دریافت کنید.";
  if (error.status === 429) return "تعداد درخواست‌ها زیاد بوده است. کمی صبر کنید و دوباره تلاش کنید.";
  if (error.status === 409) return "این کد قبلاً استفاده شده است. یک کد جدید دریافت کنید.";
  if (error.status === 400) return "کد واردشده درست نیست یا شماره موبایل معتبر نیست.";
  return "ورود انجام نشد. دوباره تلاش کنید.";
}
