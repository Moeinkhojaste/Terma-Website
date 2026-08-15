"use client";

import { useEffect, useState } from "react";
import { AccountShell } from "./components/account-shell";
import { AddressModal } from "./components/address-modal";
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  type CustomerAddress,
  type AddressWriteRequest,
} from "./account-api";
import {
  MapPinIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
} from "@/components/ui/icons";

export function AccountAddressesClient() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadAddresses = () => {
    setLoading(true);
    getCustomerAddresses()
      .then(setAddresses)
      .catch((err) => setError(err.message || "خطا در دریافت لیست آدرس‌ها"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getCustomerAddresses()
      .then(setAddresses)
      .catch((err) => setError(err.message || "خطا در دریافت لیست آدرس‌ها"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(data: AddressWriteRequest) {
    if (editingAddress) {
      await updateCustomerAddress(editingAddress.id, data);
    } else {
      await createCustomerAddress(data);
    }
    loadAddresses();
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustomerAddress(id);
      setDeleteConfirmId(null);
      loadAddresses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در حذف آدرس");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultCustomerAddress(id);
      loadAddresses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در تعیین آدرس پیش‌فرض");
    }
  }

  return (
    <AccountShell title="آدرس‌های من" breadcrumbs={[{ label: "آدرس‌های من" }]}>
      <div className="account-addresses-view">
        <div className="addresses-top-bar">
          <p className="addresses-top-desc">
            آدرس‌های ثبت‌شده برای ارسال سریع سفارش‌ها در مرحله تسویه‌حساب مورد استفاده قرار می‌گیرند.
          </p>
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              setEditingAddress(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            <span>افزودن آدرس جدید</span>
          </button>
        </div>

        {loading ? (
          <div className="cart-loading" role="status">
            در حال بارگذاری آدرس‌ها…
          </div>
        ) : error ? (
          <div className="account-error" role="alert">
            {error}
          </div>
        ) : addresses.length === 0 ? (
          <div className="commerce-empty">
            <MapPinIcon className="size-12 text-slate-400" />
            <h2>هنوز هیچ آدرسی ثبت نکرده‌اید</h2>
            <p>با افزودن آدرس، مراحل ثبت سفارش را بسیار سریع‌تر انجام دهید.</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                setEditingAddress(null);
                setModalOpen(true);
              }}
            >
              افزودن اولین آدرس
            </button>
          </div>
        ) : (
          <div className="addresses-grid">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`address-card ${address.isDefault ? "address-card--default" : ""}`}
              >
                <div className="address-card-header">
                  <div className="address-title-group">
                    <MapPinIcon className="size-5 text-amber-800" />
                    <strong>{address.title}</strong>
                  </div>
                  {address.isDefault && (
                    <span className="address-default-pill">
                      <CheckIcon className="size-3.5" />
                      <span>پیش‌فرض</span>
                    </span>
                  )}
                </div>

                <div className="address-card-content">
                  <p className="address-recipient">
                    <span>تحویل‌گیرنده:</span>
                    <strong>{address.receiverName}</strong>
                    <span dir="ltr">({address.receiverPhone})</span>
                  </p>
                  <p className="address-location">
                    <span>موقعیت:</span>
                    <span>
                      {address.province}، {address.city}
                    </span>
                  </p>
                  <p className="address-detail">{address.address}</p>
                  <p className="address-postal">
                    <span>کد پستی:</span>
                    <strong dir="ltr">{address.postalCode}</strong>
                  </p>
                </div>

                <div className="address-card-actions">
                  {!address.isDefault && (
                    <button
                      type="button"
                      className="text-link text-link--sm"
                      onClick={() => handleSetDefault(address.id)}
                    >
                      انتخاب به عنوان پیش‌فرض
                    </button>
                  )}

                  <div className="address-button-group">
                    <button
                      type="button"
                      className="button button--secondary button--sm"
                      onClick={() => {
                        setEditingAddress(address);
                        setModalOpen(true);
                      }}
                      aria-label="ویرایش آدرس"
                    >
                      <EditIcon className="size-3.5" />
                      <span>ویرایش</span>
                    </button>

                    <button
                      type="button"
                      className="button button--danger-outline button--sm"
                      onClick={() => setDeleteConfirmId(address.id)}
                      aria-label="حذف آدرس"
                    >
                      <TrashIcon className="size-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmId === address.id && (
                  <div className="address-delete-confirm-overlay">
                    <p>آیا از حذف این آدرس مطمئن هستید؟</p>
                    <div className="address-delete-confirm-actions">
                      <button
                        type="button"
                        className="button button--danger button--sm"
                        onClick={() => handleDelete(address.id)}
                      >
                        بله، حذف
                      </button>
                      <button
                        type="button"
                        className="button button--secondary button--sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        انصراف
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddressModal
        isOpen={modalOpen}
        initialData={editingAddress}
        onClose={() => {
          setModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={handleSave}
      />
    </AccountShell>
  );
}
