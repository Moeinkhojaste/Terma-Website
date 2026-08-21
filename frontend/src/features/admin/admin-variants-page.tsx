"use client";

import { useEffect, useState, useCallback } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { createVariant, updateVariant, deleteVariant, getVariants, type ProductVariant } from "@/features/admin/store-api";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";

const emptyForm = {
  title: "تنوع ۶ نفره",
  sku: "",
  color: "",
  price: "",
  compareAtPrice: "",
  stockQuantity: "10",
  tableCapacity: "6",
  length: "160",
  width: "110",
};

export function AdminVariantsPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ProductVariant[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    if (id) {
      getVariants(id).then(setItems).catch((e) => setError(getApiErrorMessage(e)));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(variant: ProductVariant) {
    setEditingId(variant.id);
    setForm({
      title: variant.title,
      sku: variant.sku,
      color: variant.color || "",
      price: String(variant.price),
      compareAtPrice: variant.compareAtPrice ? String(variant.compareAtPrice) : "",
      stockQuantity: String(variant.stockQuantity),
      tableCapacity: String(variant.tableCapacity),
      length: String(variant.length),
      width: String(variant.width),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function remove(variantId: string) {
    if (!window.confirm("آیا از حذف یا غیرفعال‌سازی این ظرفیت اطمینان دارید؟")) return;
    try {
      await deleteVariant(variantId);
      load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const payload = {
        title: form.title,
        sku: form.sku,
        color: form.color,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        stockQuantity: Number(form.stockQuantity),
        tableCapacity: Number(form.tableCapacity),
        length: Number(form.length),
        width: Number(form.width),
        isActive: true,
      };

      if (editingId) {
        await updateVariant(editingId, payload);
      } else {
        await createVariant(id, payload);
      }

      resetForm();
      load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <AdminShell title="مدیریت ظرفیت‌ها و ابعاد محصول">
      <div className="admin-products-layout">
        <form className="admin-panel admin-form" onSubmit={submit}>
          <div className="admin-panel__heading">
            <div>
              <p className="section-eyebrow">کاتالوگ محصولات</p>
              <h2>{editingId ? "ویرایش ظرفیت و ابعاد" : "تعریف ظرفیت و ابعاد جدید"}</h2>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {editingId && (
                <button type="button" className="button button--secondary" onClick={resetForm}>
                  لغو ویرایش
                </button>
              )}
              <Link href="/admin/products" className="button button--secondary">
                بازگشت به محصولات
              </Link>
            </div>
          </div>

          {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}

          <div className="form-grid">
            <label className="form-field">
              <span>عنوان تنوع (مثال: ۶ نفره)</span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((v) => ({ ...v, title: e.target.value }))}
                required
                placeholder="مثال: ۶ نفره"
              />
            </label>

            <label className="form-field">
              <span>ظرفیت میز (تعداد نفرات)</span>
              <select
                value={form.tableCapacity}
                onChange={(e) => {
                  const cap = e.target.value;
                  let l = form.length;
                  let w = form.width;
                  if (cap === "4") { l = "100"; w = "100"; }
                  else if (cap === "6") { l = "160"; w = "110"; }
                  else if (cap === "8") { l = "240"; w = "110"; }
                  setForm((v) => ({ ...v, tableCapacity: cap, length: l, width: w, title: `${cap} نفره` }));
                }}
                required
              >
                <option value="4">۴ نفره</option>
                <option value="6">۶ نفره</option>
                <option value="8">۸ نفره</option>
                <option value="10">۱۰ نفره</option>
                <option value="12">۱۲ نفره</option>
              </select>
            </label>

            <label className="form-field">
              <span>طول سفره (سانتی‌متر)</span>
              <input
                type="number"
                value={form.length}
                onChange={(e) => setForm((v) => ({ ...v, length: e.target.value }))}
                required
              />
            </label>

            <label className="form-field">
              <span>عرض سفره (سانتی‌متر)</span>
              <input
                type="number"
                value={form.width}
                onChange={(e) => setForm((v) => ({ ...v, width: e.target.value }))}
                required
              />
            </label>

            <label className="form-field">
              <span>قیمت فروش این ظرفیت (تومان)</span>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((v) => ({ ...v, price: e.target.value }))}
                required
                placeholder="قیمت به تومان"
              />
            </label>

            <label className="form-field">
              <span>قیمت اصلی / قبل از تخفیف (تومان - اختیاری)</span>
              <input
                type="number"
                value={form.compareAtPrice}
                onChange={(e) => setForm((v) => ({ ...v, compareAtPrice: e.target.value }))}
                placeholder="جهت اعمال تخفیف"
              />
            </label>

            <label className="form-field">
              <span>موجودی کل انبار (فیزیکی)</span>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={(e) => setForm((v) => ({ ...v, stockQuantity: e.target.value }))}
                required
                min="0"
              />
              {editingId && (() => {
                const currentVariant = items.find((i) => i.id === editingId);
                if (currentVariant && currentVariant.reservedQuantity > 0) {
                  return (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--color-warning, #b45309)",
                        background: "rgba(245, 158, 11, 0.08)",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        marginTop: "0.35rem",
                        border: "1px solid rgba(245, 158, 11, 0.25)",
                      }}
                    >
                      ⚠️ <strong>{currentVariant.reservedQuantity} عدد</strong> در سفارش‌های در انتظار رزرو است (موجودی آزاد قابل فروش: <strong>{currentVariant.availableQuantity} عدد</strong>).
                    </div>
                  );
                }
                return null;
              })()}
            </label>

            <label className="form-field">
              <span>کد محصول (SKU تنوع)</span>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setForm((v) => ({ ...v, sku: e.target.value }))}
                required
                dir="ltr"
                placeholder="مثال: TER-LAJ-6P-001"
              />
            </label>

            <label className="form-field">
              <span>رنگ (اختیاری)</span>
              <input
                type="text"
                value={form.color}
                onChange={(e) => setForm((v) => ({ ...v, color: e.target.value }))}
                placeholder="بدون تغییر"
              />
            </label>
          </div>

          <button className="button button--primary" disabled={pending} type="submit">
            {pending ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات ظرفیت" : "ذخیره ظرفیت جدید"}
          </button>
        </form>

        <div className="admin-panel admin-table-wrap">
          <div className="admin-panel__heading">
            <div>
              <p className="section-eyebrow">ظرفیت‌های ثبت شده</p>
              <h2>لیست ابعاد و ظرفیت‌های این محصول</h2>
            </div>
            <span className="status-pill">{items.length} مورد</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>عنوان ظرفیت</th>
                <th>ظرفیت میز</th>
                <th>ابعاد (طول × عرض)</th>
                <th>قیمت</th>
                <th>وضعیت موجودی انبار</th>
                <th>SKU</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.title}</strong>
                  </td>
                  <td>{x.tableCapacity} نفره</td>
                  <td>
                    {x.length} × {x.width} سانتی‌متر
                  </td>
                  <td>
                    {x.compareAtPrice && x.compareAtPrice > x.price ? (
                      <div>
                        <s style={{ opacity: 0.65, fontSize: "0.85em" }}>{formatPrice(x.compareAtPrice)}</s>
                        <div>
                          <strong>{formatPrice(x.price)}</strong>
                        </div>
                      </div>
                    ) : (
                      formatPrice(x.price)
                    )}
                  </td>
                  <td>
                    {x.reservedQuantity > 0 ? (
                      <div>
                        <strong style={{ color: "var(--color-primary, #047857)" }}>
                          {x.availableQuantity} عدد قابل فروش
                        </strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                          (کل انبار: {x.stockQuantity} | رزرو شده: {x.reservedQuantity})
                        </div>
                      </div>
                    ) : (
                      <div>
                        <strong>{x.stockQuantity} عدد</strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block" }}>
                          (تماماً قابل فروش)
                        </span>
                      </div>
                    )}
                  </td>
                  <td dir="ltr">{x.sku}</td>
                  <td>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => startEdit(x)}>
                        ویرایش
                      </button>
                      <button type="button" onClick={() => remove(x.id)}>
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {items.length === 0 && (
            <div className="admin-empty">هنوز ظرفیت مجزایی ثبت نشده است (از ابعاد پیش‌فرض محصول استفاده می‌شود).</div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
