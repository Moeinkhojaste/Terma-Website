"use client";

import { useState, type FormEvent } from "react";
import { normalizeIranianMobile, normalizeNumericText } from "@/lib/iranian-phone";
import type { CustomerAddress, AddressWriteRequest } from "../account-api";

type AddressModalProps = {
  initialData?: CustomerAddress | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddressWriteRequest) => Promise<void>;
};

export function AddressModal({ initialData, isOpen, onClose, onSave }: AddressModalProps) {
  const [title, setTitle] = useState(initialData?.title || "منزل");
  const [receiverName, setReceiverName] = useState(initialData?.receiverName || "");
  const [receiverPhone, setReceiverPhone] = useState(initialData?.receiverPhone || "");
  const [province, setProvince] = useState(initialData?.province || "تهران");
  const [city, setCity] = useState(initialData?.city || "تهران");
  const [address, setAddress] = useState(initialData?.address || "");
  const [postalCode, setPostalCode] = useState(initialData?.postalCode || "");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  function validate() {
    const errs: Record<string, string> = {};
    if (!receiverName.trim()) errs.receiverName = "نام تحویل‌گیرنده را وارد کنید.";
    if (!receiverPhone.trim()) {
      errs.receiverPhone = "شماره موبایل تحویل‌گیرنده را وارد کنید.";
    } else if (!normalizeIranianMobile(receiverPhone)) {
      errs.receiverPhone = "شماره موبایل معتبر نیست (مانند ۰۹۱۲...).";
    }
    if (!province.trim()) errs.province = "استان را وارد کنید.";
    if (!city.trim()) errs.city = "شهر را وارد کنید.";
    if (!address.trim() || address.trim().length < 5) {
      errs.address = "نشانی دقیق پستی را به طور کامل وارد کنید.";
    }
    const cleanPostal = normalizeNumericText(postalCode);
    if (!cleanPostal || cleanPostal.length !== 10) {
      errs.postalCode = "کد پستی باید دقیقاً ۱۰ رقم باشد.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    setError("");

    try {
      await onSave({
        title: title.trim() || "آدرس من",
        receiverName: receiverName.trim(),
        receiverPhone: normalizeIranianMobile(receiverPhone) || receiverPhone.trim(),
        province: province.trim(),
        city: city.trim(),
        address: address.trim(),
        postalCode: normalizeNumericText(postalCode),
        isDefault,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطایی در ذخیره آدرس رخ داد.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="address-modal-title">
      <div className="account-modal-card account-modal-card--lg">
        <div className="account-modal-header">
          <h3 id="address-modal-title">{initialData ? "ویرایش آدرس" : "افزودن آدرس جدید"}</h3>
          <button type="button" className="account-modal-close" onClick={onClose} aria-label="بستن">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="account-modal-form">
          <div className="form-grid-2">
            <label className="form-field">
              <span>عنوان آدرس (اختیاری)</span>
              <input
                type="text"
                placeholder="مثلاً: منزل، محل کار"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label className="form-field">
              <span>نام و نام خانوادگی تحویل‌گیرنده *</span>
              <input
                type="text"
                placeholder="نام کامل"
                value={receiverName}
                onChange={(e) => {
                  setReceiverName(e.target.value);
                  setErrors((prev) => ({ ...prev, receiverName: "" }));
                }}
                aria-invalid={Boolean(errors.receiverName)}
              />
              {errors.receiverName && <small className="form-field__error">{errors.receiverName}</small>}
            </label>
          </div>

          <div className="form-grid-2">
            <label className="form-field">
              <span>شماره موبایل تحویل‌گیرنده *</span>
              <input
                type="tel"
                dir="ltr"
                placeholder="۰۹۱۲..."
                value={receiverPhone}
                onChange={(e) => {
                  setReceiverPhone(e.target.value);
                  setErrors((prev) => ({ ...prev, receiverPhone: "" }));
                }}
                aria-invalid={Boolean(errors.receiverPhone)}
              />
              {errors.receiverPhone && <small className="form-field__error">{errors.receiverPhone}</small>}
            </label>

            <label className="form-field">
              <span>کد پستی ۱۰ رقمی *</span>
              <input
                type="text"
                dir="ltr"
                maxLength={10}
                placeholder="۱۲۳۴۵۶۷۸۹۰"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  setErrors((prev) => ({ ...prev, postalCode: "" }));
                }}
                aria-invalid={Boolean(errors.postalCode)}
              />
              {errors.postalCode && <small className="form-field__error">{errors.postalCode}</small>}
            </label>
          </div>

          <div className="form-grid-2">
            <label className="form-field">
              <span>استان *</span>
              <input
                type="text"
                placeholder="استان"
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setErrors((prev) => ({ ...prev, province: "" }));
                }}
                aria-invalid={Boolean(errors.province)}
              />
              {errors.province && <small className="form-field__error">{errors.province}</small>}
            </label>

            <label className="form-field">
              <span>شهر *</span>
              <input
                type="text"
                placeholder="شهر"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setErrors((prev) => ({ ...prev, city: "" }));
                }}
                aria-invalid={Boolean(errors.city)}
              />
              {errors.city && <small className="form-field__error">{errors.city}</small>}
            </label>
          </div>

          <label className="form-field">
            <span>نشانی دقیق پستی *</span>
            <textarea
              rows={3}
              placeholder="نام خیابان، کوچه، پلاک، واحد..."
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setErrors((prev) => ({ ...prev, address: "" }));
              }}
              aria-invalid={Boolean(errors.address)}
            />
            {errors.address && <small className="form-field__error">{errors.address}</small>}
          </label>

          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span>این آدرس به عنوان آدرس پیش‌فرض ذخیره شود.</span>
          </label>

          {error && <div className="account-error" role="alert">{error}</div>}

          <div className="account-modal-actions">
            <button type="submit" className="button button--primary" disabled={busy}>
              {busy ? "در حال ذخیره…" : "ذخیره آدرس"}
            </button>
            <button type="button" className="button button--secondary" onClick={onClose} disabled={busy}>
              انصراف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
