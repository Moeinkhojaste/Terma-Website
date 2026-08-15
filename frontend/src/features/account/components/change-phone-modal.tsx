"use client";

import { useState, useEffect, type FormEvent } from "react";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";
import {
  requestPhoneChangeOtp,
  verifyPhoneChangeOtp,
  type OtpChallenge,
} from "../account-api";
import { ApiError } from "@/lib/api-client";

type ChangePhoneModalProps = {
  isOpen: boolean;
  currentPhone: string;
  onClose: () => void;
  onSuccess: (newPhone: string) => void;
};

export function ChangePhoneModal({
  isOpen,
  currentPhone,
  onClose,
  onSuccess,
}: ChangePhoneModalProps) {
  const [newPhone, setNewPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<OtpChallenge | null>(null);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  if (!isOpen) return null;

  function validatePhone(value: string) {
    if (!value.trim()) return "شماره موبایل جدید را وارد کنید.";
    const normalized = normalizeIranianMobile(value);
    if (!normalized) return "شماره را مانند ۰۹۱۲... وارد کنید.";
    if (normalized === normalizeIranianMobile(currentPhone)) {
      return "شماره جدید نمی‌تواند همان شماره فعلی باشد.";
    }
    return "";
  }

  function validateCode(value: string) {
    if (!value.trim()) return "کد تأیید را وارد کنید.";
    if (!/^\d{6}$/.test(normalizeNumericText(value))) {
      return "کد تأیید باید ۶ رقم باشد.";
    }
    return "";
  }

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    const pErr = validatePhone(newPhone);
    setPhoneError(pErr);
    if (pErr) return;

    setBusy(true);
    setError("");

    try {
      const normalized = normalizeIranianMobile(newPhone)!;
      const res = await requestPhoneChangeOtp(normalized);
      setChallenge(res);
      setTimer(res.retryAfterSeconds || 60);
    } catch (err) {
      setError(getOtpErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    if (!challenge) return;
    const cErr = validateCode(code);
    setCodeError(cErr);
    if (cErr) return;

    setBusy(true);
    setError("");

    try {
      const normalized = normalizeIranianMobile(newPhone)!;
      await verifyPhoneChangeOtp(challenge.challengeId, normalizeNumericText(code), normalized);
      onSuccess(newPhone);
      onClose();
    } catch (err) {
      setError(getOtpErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="change-phone-title">
      <div className="account-modal-card">
        <div className="account-modal-header">
          <h3 id="change-phone-title">تغییر شماره موبایل</h3>
          <button type="button" className="account-modal-close" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>

        {!challenge ? (
          <form onSubmit={handleSendOtp} className="account-modal-form">
            <p className="account-modal-description">
              برای تغییر شماره موبایل، ابتدا شماره جدید را وارد کنید. کد تأیید پیامکی به این شماره ارسال خواهد شد.
            </p>

            <label className="form-field">
              <span>شماره موبایل جدید</span>
              <input
                type="tel"
                dir="ltr"
                placeholder="۰۹۱۲..."
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  setPhoneError(validatePhone(e.target.value));
                  setError("");
                }}
                aria-invalid={Boolean(phoneError)}
              />
              {phoneError && <small className="form-field__error">{phoneError}</small>}
            </label>

            {error && <div className="account-error" role="alert">{error}</div>}

            <div className="account-modal-actions">
              <button type="submit" className="button button--primary" disabled={busy}>
                {busy ? "در حال ارسال…" : "ارسال کد تأیید"}
              </button>
              <button type="button" className="button button--secondary" onClick={onClose} disabled={busy}>
                انصراف
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="account-modal-form">
            <p className="account-modal-description">
              کد ۶ رقمی ارسال‌شده برای شماره <strong dir="ltr">{newPhone}</strong> را وارد کنید:
            </p>

            {challenge.developmentCode && (
              <div className="development-otp" role="status">
                کد نسخه آزمایشی: <strong dir="ltr">{challenge.developmentCode}</strong>
              </div>
            )}

            <label className="form-field">
              <span>کد تأیید ۶ رقمی</span>
              <input
                type="text"
                dir="ltr"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="۱۲۳۴۵۶"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(validateCode(e.target.value));
                  setError("");
                }}
                aria-invalid={Boolean(codeError)}
              />
              {codeError && <small className="form-field__error">{codeError}</small>}
            </label>

            {timer > 0 ? (
              <div className="otp-timer-text">
                ارسال مجدد کد پس از <span>{timer}</span> ثانیه
              </div>
            ) : (
              <button
                type="button"
                className="text-link text-link--sm"
                onClick={handleSendOtp}
                disabled={busy}
              >
                ارسال مجدد کد تأیید
              </button>
            )}

            {error && <div className="account-error" role="alert">{error}</div>}

            <div className="account-modal-actions">
              <button type="submit" className="button button--primary" disabled={busy}>
                {busy ? "در حال بررسی…" : "تأیید و تغییر شماره"}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setChallenge(null);
                  setCode("");
                  setError("");
                }}
                disabled={busy}
              >
                تغییر شماره
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function getOtpErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "خطایی در انجام عملیات رخ داد. دوباره تلاش کنید.";
  if (error.isNetworkError) return "ارتباط با سرور برقرار نشد.";
  if (error.status === 409) return "این شماره موبایل قبلاً برای حساب دیگری ثبت شده است.";
  if (error.status === 410) return "کد تأیید منقضی شده است. کد جدید دریافت کنید.";
  if (error.status === 429) return "تعداد تلاش‌ها زیاد بوده است. لطفاً چند دقیقه بعد تلاش کنید.";
  if (error.status === 400) return "کد واردشده صحیح نیست.";
  return error.message || "خطایی رخ داد. دوباره تلاش کنید.";
}
