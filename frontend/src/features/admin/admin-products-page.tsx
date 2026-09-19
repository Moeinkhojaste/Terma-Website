"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import type { CategoryDto, PagedResponse, ProductDto } from "@/features/products/models";
import { getVariants, createVariant, updateVariant, deleteVariant, type ProductVariant } from "@/features/admin/store-api";

const emptyProductForm = {
  name: "",
  sku: "",
  description: "",
  detailedDescription: "",
  price: "",
  discountPercent: "",
  stockQuantity: "",
  tableCapacity: "4",
  length: "100",
  width: "100",
  fabricType: "ترمه",
  liningType: "ساتن",
  color: "",
  pattern: "",
  categoryId: "",
  isActive: true,
};

const emptyVariantForm = {
  id: "",
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

export function AdminProductsPage() {
  const [items, setItems] = useState<ProductDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [form, setForm] = useState(emptyProductForm);
  const [editingId, setEditingId] = useState<string>();
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantForm, setVariantForm] = useState(emptyVariantForm);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const load = useCallback(() => {
    return Promise.all([
      apiRequest<PagedResponse<ProductDto>>("/api/admin/products?pageSize=100", { cache: "no-store" }),
      apiRequest<CategoryDto[]>("/api/admin/categories", { cache: "no-store" }),
    ])
      .then(([p, c]) => {
        setItems(p.items);
        setCategories(c);
        if (!form.categoryId && c[0]) {
          setForm((v) => ({ ...v, categoryId: c[0].id }));
        }
      })
      .catch((e) => setError(getApiErrorMessage(e)));
  }, [form.categoryId]);

  const loadVariants = useCallback((productId: string) => {
    getVariants(productId)
      .then(setVariants)
      .catch((e) => setError(getApiErrorMessage(e)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function changeProduct(key: keyof typeof emptyProductForm, value: string | boolean) {
    setForm((v) => ({ ...v, [key]: value }));
  }

  function startEditProduct(item: ProductDto) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      sku: item.sku,
      description: item.description ?? "",
      detailedDescription: item.detailedDescription ?? "",
      price: item.compareAtPrice ? String(item.compareAtPrice) : String(item.price),
      discountPercent: item.discountPercent ? String(item.discountPercent) : "",
      stockQuantity: String(item.stockQuantity),
      tableCapacity: String(item.tableCapacity),
      length: String(item.length),
      width: String(item.width),
      fabricType: item.fabricType,
      liningType: item.liningType,
      color: item.color,
      pattern: item.pattern,
      categoryId: item.categoryId,
      isActive: item.isActive ?? true,
    });
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
    loadVariants(item.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(undefined);
    setForm({ ...emptyProductForm, categoryId: categories[0]?.id ?? "" });
    setVariants([]);
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
  }

  async function submitProduct(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const payload = {
      ...form,
      price: Number(form.price),
      discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
      stockQuantity: Number(form.stockQuantity),
      tableCapacity: Number(form.tableCapacity),
      length: Number(form.length),
      width: Number(form.width),
    };
    try {
      await apiRequest<ProductDto>(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (editingId) {
        await loadVariants(editingId);
      } else {
        cancelEdit();
      }
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function removeProduct(id: string) {
    if (!window.confirm("این گروه محصول غیرفعال شود؟")) return;
    try {
      await apiRequest(`/api/admin/products/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  // --- Variant Handlers ---
  function startEditVariant(v: ProductVariant) {
    setEditingVariantId(v.id);
    setVariantForm({
      id: v.id,
      title: v.title,
      sku: v.sku,
      color: v.color || form.color,
      price: String(v.price),
      compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : "",
      stockQuantity: String(v.stockQuantity),
      tableCapacity: String(v.tableCapacity),
      length: String(v.length),
      width: String(v.width),
    });
  }

  function resetVariantForm() {
    setEditingVariantId(null);
    setVariantForm(emptyVariantForm);
  }

  async function submitVariant(e: FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setPending(true);
    setError(undefined);
    try {
      const payload = {
        title: variantForm.title,
        sku: variantForm.sku,
        color: form.color, // Inherits shared group color!
        price: Number(variantForm.price),
        compareAtPrice: variantForm.compareAtPrice ? Number(variantForm.compareAtPrice) : null,
        stockQuantity: Number(variantForm.stockQuantity),
        tableCapacity: Number(variantForm.tableCapacity),
        length: Number(variantForm.length),
        width: Number(variantForm.width),
        isActive: true,
      };

      if (editingVariantId) {
        await updateVariant(editingVariantId, payload);
      } else {
        await createVariant(editingId, payload);
      }

      resetVariantForm();
      await loadVariants(editingId);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function removeVariant(variantId: string) {
    if (!window.confirm("آیا از حذف این ظرفیت اطمینان دارید؟")) return;
    try {
      await deleteVariant(variantId);
      if (editingId) await loadVariants(editingId);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  function calculateTotalStock(item: ProductDto): number {
    if (item.variants && item.variants.length > 0) {
      return item.variants
        .filter((v) => v.isActive !== false)
        .reduce((sum, v) => sum + (v.availableQuantity ?? v.stockQuantity ?? 0), 0);
    }
    return item.availableQuantity ?? item.stockQuantity ?? 0;
  }

  return (
    <AdminShell title="مدیریت کاتالوگ و گروه محصولات">
      <div className="admin-products-layout">
        {/* Main Product Form */}
        <form className="admin-panel admin-form" onSubmit={submitProduct}>
          <div className="admin-panel__heading">
            <div>
              <p className="section-eyebrow">{editingId ? "ویرایش گروه محصول" : "کاتالوگ محصولات"}</p>
              <h2>{editingId ? "مشخصات عمومی و مشترک گروه محصول" : "ایجاد گروه محصول جدید"}</h2>
            </div>
            {editingId && (
              <button type="button" className="button button--secondary" onClick={cancelEdit}>
                لغو و انصراف
              </button>
            )}
          </div>

          <PageError error={error} />

          <p style={{ fontSize: "0.9rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            تغییر این مشخصات (مانند نام، دسته‌بندی، رنگ، طرح، پارچه، آستر و توضیحات) روی تمامی ظرفیت‌های این محصول اعمال خواهد شد.
          </p>

          <div className="form-grid">
            <Field label="نام محصول" value={form.name} onChange={(v) => changeProduct("name", v)} required />
            <Field label="SKU پایه" value={form.sku} onChange={(v) => changeProduct("sku", v)} required dir="ltr" />
            <Field label="قیمت پایه (تومان)" value={form.price} onChange={(v) => changeProduct("price", v)} type="number" required />
            <Field label="درصد تخفیف عمومی (%)" value={form.discountPercent} onChange={(v) => changeProduct("discountPercent", v)} type="number" min="0" max="99" />
            <Field label="موجودی پایه" value={form.stockQuantity} onChange={(v) => changeProduct("stockQuantity", v)} type="number" required />
            <Field label="ظرفیت اصلی (پیش‌فرض)" value={form.tableCapacity} onChange={(v) => changeProduct("tableCapacity", v)} type="number" required />
            <Field label="طول پیش‌فرض (سانتی‌متر)" value={form.length} onChange={(v) => changeProduct("length", v)} type="number" required />
            <Field label="عرض پیش‌فرض (سانتی‌متر)" value={form.width} onChange={(v) => changeProduct("width", v)} type="number" required />

            <label className="form-field">
              <span>دسته‌بندی</span>
              <select value={form.categoryId} onChange={(e) => changeProduct("categoryId", e.target.value)} required>
                <option value="">انتخاب کنید</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>

            <Field label="رنگ اصلی (مشترک)" value={form.color} onChange={(v) => changeProduct("color", v)} required />
            <Field label="طرح (مشترک)" value={form.pattern} onChange={(v) => changeProduct("pattern", v)} required />
            <Field label="نوع پارچه (مشترک)" value={form.fabricType} onChange={(v) => changeProduct("fabricType", v)} required />
            <Field label="نوع آستر (مشترک)" value={form.liningType} onChange={(v) => changeProduct("liningType", v)} required />

            <label className="form-field form-field--full">
              <span>خلاصه کوتاه محصول (نمایش زیر عنوان بالای صفحه)</span>
              <textarea
                value={form.description}
                onChange={(e) => changeProduct("description", e.target.value)}
                rows={2}
                placeholder="یک یا دو خط خلاصه کوتاه از سفره که در بالای صفحه زیر نام سفره نمایش داده می‌شود..."
              />
            </label>

            <label className="form-field form-field--full">
              <span>توضیحات تفصیلی (نمایش در بخش جزئیات محصول)</span>
              <textarea
                value={form.detailedDescription}
                onChange={(e) => changeProduct("detailedDescription", e.target.value)}
                rows={4}
                placeholder="چند خط توضیحات تفصیلی، داستان بافت و ویژگی‌های سفره که در جدول جزئیات محصول نمایش داده می‌شود..."
              />
            </label>
          </div>

          <label className="admin-check">
            <input type="checkbox" checked={form.isActive} onChange={(e) => changeProduct("isActive", e.target.checked)} />
            محصول در فروشگاه نمایش داده شود
          </label>

          <button className="button button--primary" disabled={pending} type="submit">
            {pending ? "در حال ذخیره…" : editingId ? "ذخیره تغییرات عمومی گروه" : "ایجاد گروه محصول"}
          </button>
        </form>

        {/* Section 2: Manage Capacities & Dimensions directly in unified view when editing */}
        {editingId && (
          <div className="admin-panel admin-form" style={{ marginTop: "1.5rem" }}>
            <div className="admin-panel__heading">
              <div>
                <p className="section-eyebrow">مدیریت ابعاد و ظرفیت‌ها</p>
                <h2>ظرفیت‌های فعال این گروه محصول</h2>
              </div>
              <span className="status-pill">{variants.length} ظرفیت ثبت‌شده</span>
            </div>

            <table className="admin-table" style={{ marginBottom: "1.5rem" }}>
              <thead>
                <tr>
                  <th>عنوان ظرفیت</th>
                  <th>ابعاد (طول × عرض)</th>
                  <th>قیمت فروش</th>
                  <th>وضعیت موجودی انبار</th>
                  <th>SKU</th>
                  <th>عملیات</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td><strong>{v.title}</strong> ({v.tableCapacity} نفره)</td>
                    <td>{v.length} × {v.width} سانتی‌متر</td>
                    <td>
                      {v.compareAtPrice && v.compareAtPrice > v.price ? (
                        <div>
                          <s style={{ opacity: 0.65, fontSize: "0.85em" }}>{formatPrice(v.compareAtPrice)}</s>
                          <div><strong>{formatPrice(v.price)}</strong></div>
                        </div>
                      ) : (
                        formatPrice(v.price)
                      )}
                    </td>
                    <td>
                      {v.reservedQuantity > 0 ? (
                        <div>
                          <strong style={{ color: "var(--color-primary, #047857)" }}>
                            {v.availableQuantity} عدد قابل فروش
                          </strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            (کل انبار: {v.stockQuantity} | رزرو: {v.reservedQuantity})
                          </div>
                        </div>
                      ) : (
                        <div>
                          <strong>{v.stockQuantity} عدد</strong>
                          <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", display: "block" }}>
                            (تماماً قابل فروش)
                          </span>
                        </div>
                      )}
                    </td>
                    <td dir="ltr">{v.sku}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => startEditVariant(v)}>ویرایش</button>
                        <button type="button" onClick={() => removeVariant(v.id)}>حذف</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {variants.length === 0 && (
              <div className="admin-empty" style={{ marginBottom: "1rem" }}>
                هنوز ظرفیت مجزایی ثبت نشده است (از ابعاد و مشخصات پیش‌فرض محصول استفاده می‌شود).
              </div>
            )}

            {/* In-place Form to Add / Edit Variant */}
            <form onSubmit={submitVariant} style={{ background: "var(--color-surface)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>
                  {editingVariantId ? "ویرایش مشخصات ظرفیت" : "افزودن ظرفیت جدید به این محصول"}
                </h3>
                {editingVariantId && (
                  <button type="button" className="button button--secondary" onClick={resetVariantForm}>
                    لغو
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label className="form-field">
                  <span>ظرفیت میز</span>
                  <select
                    value={variantForm.tableCapacity}
                    onChange={(e) => {
                      const cap = e.target.value;
                      let l = variantForm.length;
                      let w = variantForm.width;
                      if (cap === "4") { l = "100"; w = "100"; }
                      else if (cap === "6") { l = "160"; w = "110"; }
                      else if (cap === "8") { l = "240"; w = "110"; }
                      setVariantForm((v) => ({ ...v, tableCapacity: cap, length: l, width: w, title: `${cap} نفره` }));
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

                <Field label="طول (سانتی‌متر)" value={variantForm.length} onChange={(v) => setVariantForm((x) => ({ ...x, length: v }))} required />
                <Field label="عرض (سانتی‌متر)" value={variantForm.width} onChange={(v) => setVariantForm((x) => ({ ...x, width: v }))} required />
                <Field label="قیمت فروش (تومان)" value={variantForm.price} onChange={(v) => setVariantForm((x) => ({ ...x, price: v }))} type="number" required />
                <Field label="قیمت اصلی / قبل از تخفیف (تومان)" value={variantForm.compareAtPrice} onChange={(v) => setVariantForm((x) => ({ ...x, compareAtPrice: v }))} type="number" placeholder="اختیاری جهت تخفیف" />
                <Field
                  label="موجودی کل انبار (فیزیکی)"
                  value={variantForm.stockQuantity}
                  onChange={(v) => setVariantForm((x) => ({ ...x, stockQuantity: v }))}
                  type="number"
                  required
                  min="0"
                  hint={
                    editingVariantId
                      ? (() => {
                          const cur = variants.find((i) => i.id === editingVariantId);
                          if (cur && cur.reservedQuantity > 0) {
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
                                ⚠️ <strong>{cur.reservedQuantity} عدد</strong> در سفارش‌های در انتظار رزرو است (موجودی آزاد قابل فروش: <strong>{cur.availableQuantity} عدد</strong>).
                              </div>
                            );
                          }
                          return null;
                        })()
                      : undefined
                  }
                />
                <Field label="SKU اختصاصی این ظرفیت" value={variantForm.sku} onChange={(v) => setVariantForm((x) => ({ ...x, sku: v }))} required dir="ltr" />
              </div>

              <button className="button button--secondary" disabled={pending} type="submit" style={{ marginTop: "1rem" }}>
                {pending ? "در حال ثبت…" : editingVariantId ? "ذخیره تغییرات ظرفیت" : "افزودن این ظرفیت"}
              </button>
            </form>
          </div>
        )}

        {/* Product Catalog Table */}
        <div className="admin-panel admin-table-wrap">
          <div className="admin-panel__heading">
            <div>
              <p className="section-eyebrow">مدیریت کاتالوگ</p>
              <h2>گروه‌های محصول فعال</h2>
            </div>
            <span className="status-pill">{items.length} مورد</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>گروه محصول</th>
                <th>SKU</th>
                <th>دسته</th>
                <th>قیمت</th>
                <th>موجودی کل (تمام ظرفیت‌ها)</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => {
                const totalStock = calculateTotalStock(x);
                return (
                  <tr key={x.id}>
                    <td>
                      <strong>{x.name}</strong>
                      <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                        رنگ: {x.color} | طرح: {x.pattern}
                      </div>
                    </td>
                    <td dir="ltr">{x.sku}</td>
                    <td>{x.categoryName}</td>
                    <td>
                      {x.compareAtPrice ? (
                        <div>
                          <s style={{ opacity: 0.65, fontSize: "0.85em" }}>{formatPrice(x.compareAtPrice)}</s>
                          <div>
                            <strong>{formatPrice(x.price)}</strong>{" "}
                            <span className="status-pill status-pill--danger" style={{ marginRight: "4px", fontSize: "0.75rem" }}>
                              {x.discountPercent}% تخفیف
                            </span>
                          </div>
                        </div>
                      ) : (
                        formatPrice(x.price)
                      )}
                    </td>
                    <td className={totalStock < 2 ? "stock-low" : ""}>
                      <strong>{totalStock} عدد</strong>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => startEditProduct(x)}>
                          ویرایش گروه و ظرفیت‌ها
                        </button>
                        <Link href={`/admin/products/${x.id}/variants`}>ظرفیت‌ها</Link>
                        <Link href={`/admin/products/${x.id}/media`}>گالری تصاویر</Link>
                        <button type="button" onClick={() => removeProduct(x.id)}>
                          غیرفعال
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 && <div className="admin-empty">محصول فعالی وجود ندارد.</div>}
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  dir,
  min,
  max,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  dir?: "ltr";
  min?: string;
  max?: string;
  placeholder?: string;
  hint?: React.ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} dir={dir} min={min} max={max} placeholder={placeholder} />
      {hint}
    </label>
  );
}

function PageError({ error }: { error?: string }) {
  return error ? <div className="admin-alert admin-alert--error" role="alert">{error}</div> : null;
}
