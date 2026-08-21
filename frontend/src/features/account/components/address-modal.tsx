"use client";

import { useState, type FormEvent } from "react";
import { normalizeNumericText } from "@/lib/iranian-phone";
import { IRAN_PROVINCES, getIranCities } from "@/lib/iran-locations";
import { XIcon } from "@/components/ui/icons";
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
  const [province, setProvince] = useState(initialData?.province || "");
  const [city, setCity] = useState(initialData?.city || "");
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
    if (!province.trim()) errs.province = "استان را انتخاب کنید.";
    if (!city.trim()) errs.city = "شهر را انتخاب کنید.";
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
            <XIcon className="size-4" />
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
              <span>استان *</span>
              <select
                value={province}
                onChange={(e) => {
                  const nextProv = e.target.value;
                  setProvince(nextProv);
                  const cities = getIranCities(nextProv);
                  if (!cities.includes(city)) {
                    setCity("");
                  }
                  setErrors((prev) => ({ ...prev, province: "" }));
                }}
                aria-invalid={Boolean(errors.province)}
              >
                <option value="">انتخاب استان...</option>
                {IRAN_PROVINCES.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
              {errors.province && <small className="form-field__error">{errors.province}</small>}
            </label>

            <label className="form-field">
              <span>شهر *</span>
              <select
                value={city}
                disabled={!province}
                onChange={(e) => {
                  setCity(e.target.value);
                  setErrors((prev) => ({ ...prev, city: "" }));
                }}
                aria-invalid={Boolean(errors.city)}
              >
                <option value="">{province ? "انتخاب شهر..." : "ابتدا استان را انتخاب کنید"}</option>
                {province &&
                  getIranCities(province).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                {city && province && !getIranCities(province).includes(city) && (
                  <option value={city}>{city}</option>
                )}
              </select>
              {errors.city && <small className="form-field__error">{errors.city}</small>}
            </label>
          </div>

          <div className="form-grid-2">
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
