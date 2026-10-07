"use client";

import { FormEvent, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminShell } from "@/features/admin/admin-shell";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import { resolveCmsMediaUrl } from "@/features/content/cms-renderer";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

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
      .then((data) => setVariants(Array.isArray(data) ? data : []))
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
      name: item.name ?? "",
      sku: item.sku ?? "",
      description: item.description ?? "",
      detailedDescription: item.detailedDescription ?? "",
      price: item.compareAtPrice ? String(item.compareAtPrice) : item.price != null ? String(item.price) : "",
      discountPercent: item.discountPercent ? String(item.discountPercent) : "",
      stockQuantity: item.stockQuantity != null ? String(item.stockQuantity) : "",
      tableCapacity: item.tableCapacity != null ? String(item.tableCapacity) : "4",
      length: item.length != null ? String(item.length) : "100",
      width: item.width != null ? String(item.width) : "100",
      fabricType: item.fabricType ?? "ترمه",
      liningType: item.liningType ?? "ساتن",
      color: item.color ?? "",
      pattern: item.pattern ?? "",
      categoryId: item.categoryId ?? "",
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
    const parsedDiscount = form.discountPercent && Number(form.discountPercent) > 0 ? Number(form.discountPercent) : null;
    const payload = {
      ...form,
      price: Number(form.price),
      discountPercent: parsedDiscount,
      stockQuantity: Number(form.stockQuantity),
      tableCapacity: Number(form.tableCapacity),
      length: Number(form.length),
      width: Number(form.width),
    };
    try {
      const updated = await apiRequest<ProductDto>(editingId ? `/api/admin/products/${editingId}` : "/api/admin/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (editingId) {
        if (updated) {
          setForm({
            name: updated.name ?? "",
            sku: updated.sku ?? "",
            description: updated.description ?? "",
            detailedDescription: updated.detailedDescription ?? "",
            price: updated.compareAtPrice ? String(updated.compareAtPrice) : updated.price != null ? String(updated.price) : "",
            discountPercent: updated.discountPercent ? String(updated.discountPercent) : "",
            stockQuantity: updated.stockQuantity != null ? String(updated.stockQuantity) : "",
            tableCapacity: updated.tableCapacity != null ? String(updated.tableCapacity) : "4",
            length: updated.length != null ? String(updated.length) : "100",
            width: updated.width != null ? String(updated.width) : "100",
            fabricType: updated.fabricType ?? "ترمه",
            liningType: updated.liningType ?? "ساتن",
            color: updated.color ?? "",
            pattern: updated.pattern ?? "",
            categoryId: updated.categoryId ?? "",
            isActive: updated.isActive ?? true,
          });
        }
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

  const filteredItems = items.filter((x) => {
    const matchesCategory = selectedCategory === "all" || x.categoryId === selectedCategory;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesCategory;
    const matchesName = x.name?.toLowerCase().includes(query);
    const matchesSku = x.sku?.toLowerCase().includes(query);
    const matchesPattern = x.pattern?.toLowerCase().includes(query);
    const matchesColor = x.color?.toLowerCase().includes(query);
    return matchesCategory && Boolean(matchesName || matchesSku || matchesPattern || matchesColor);
  });

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
          <div className="admin-panel admin-form">
            <div className="admin-panel__heading">
              <div>
                <p className="section-eyebrow">مدیریت ابعاد و ظرفیت‌ها</p>
                <h2>ظرفیت‌های فعال این گروه محصول</h2>
              </div>
              <span className="status-pill status-pill--success">{variants.length} ظرفیت ثبت‌شده</span>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table" style={{ marginBottom: "1rem" }}>
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
                      <td data-label="عنوان ظرفیت">
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                          <strong>{v.title}</strong>
                          <span className="admin-category-badge">{v.tableCapacity} نفره</span>
                        </div>
                      </td>
                      <td data-label="ابعاد">
                        <span className="admin-dim-chip">{v.length} × {v.width} سانتی‌متر</span>
                      </td>
                      <td data-label="قیمت فروش">
                        {v.compareAtPrice && v.compareAtPrice > v.price ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", whiteSpace: "nowrap" }}>
                            <s style={{ opacity: 0.65, fontSize: "0.82em", color: "var(--color-muted, #716b64)" }}>
                              {formatPrice(v.compareAtPrice)}
                            </s>
                            <div>
                              <strong>{formatPrice(v.price)}</strong>
                            </div>
                          </div>
                        ) : (
                          <strong style={{ whiteSpace: "nowrap" }}>{formatPrice(v.price)}</strong>
                        )}
                      </td>
                      <td data-label="وضعیت موجودی">
                        {v.reservedQuantity > 0 ? (
                          <div>
                            <span className="admin-stock-badge admin-stock-badge--success">
                              {v.availableQuantity} عدد آزاد
                            </span>
                            <div style={{ fontSize: "0.76rem", color: "var(--color-text-muted, #716b64)", marginTop: "3px", whiteSpace: "nowrap" }}>
                              (کل: {v.stockQuantity} | رزرو: {v.reservedQuantity})
                            </div>
                          </div>
                        ) : v.stockQuantity > 0 ? (
                          <span className="admin-stock-badge admin-stock-badge--success">
                            {v.stockQuantity} عدد موجود
                          </span>
                        ) : (
                          <span className="admin-stock-badge admin-stock-badge--danger">
                            ناموجود (۰ عدد)
                          </span>
                        )}
                      </td>
                      <td data-label="SKU">
                        <span className="admin-sku-chip">{v.sku}</span>
                      </td>
                      <td data-label="عملیات">
                        <div className="admin-row-actions">
                          <button type="button" onClick={() => startEditVariant(v)}>ویرایش</button>
                          <button type="button" className="admin-btn--danger" onClick={() => removeVariant(v.id)}>حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {variants.length === 0 && (
              <div className="admin-empty" style={{ marginBottom: "1rem" }}>
                هنوز ظرفیت مجزایی ثبت نشده است (از ابعاد و مشخصات پیش‌فرض محصول استفاده می‌شود).
              </div>
            )}

            {/* In-place Form to Add / Edit Variant */}
            <form onSubmit={submitVariant} className="admin-capacity-form-box">
              <div className="admin-capacity-form-box__heading">
                <h3>
                  {editingVariantId ? "✏️ ویرایش مشخصات ظرفیت" : "➕ افزودن ظرفیت جدید به این محصول"}
                </h3>
                {editingVariantId && (
                  <button type="button" className="button button--secondary" onClick={resetVariantForm} style={{ minHeight: "2rem", padding: "0.25rem 0.75rem", fontSize: "0.82rem" }}>
                    لغو ویرایش
                  </button>
                )}
              </div>

              <div className="admin-capacity-grid">
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
                <Field label="قیمت اصلی قبل تخفیف" value={variantForm.compareAtPrice} onChange={(v) => setVariantForm((x) => ({ ...x, compareAtPrice: v }))} type="number" placeholder="اختیاری جهت تخفیف" />
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
                                  fontSize: "0.78rem",
                                  color: "var(--color-warning, #b45309)",
                                  background: "rgba(245, 158, 11, 0.08)",
                                  padding: "0.35rem 0.5rem",
                                  borderRadius: "6px",
                                  marginTop: "0.35rem",
                                  border: "1px solid rgba(245, 158, 11, 0.25)",
                                }}
                              >
                                ⚠️ <strong>{cur.reservedQuantity} عدد</strong> رزرو در سفارش‌ها (آزاد: <strong>{cur.availableQuantity}</strong>).
                              </div>
                            );
                          }
                          return null;
                        })()
                      : undefined
                  }
                />
                <Field label="SKU این ظرفیت" value={variantForm.sku} onChange={(v) => setVariantForm((x) => ({ ...x, sku: v }))} required dir="ltr" />
              </div>

              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button className="button button--secondary" disabled={pending} type="submit">
                  {pending ? "در حال ثبت…" : editingVariantId ? "ذخیره تغییرات ظرفیت" : "افزودن این ظرفیت"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Product Catalog Table */}
        <div className={`admin-panel admin-table-wrap ${editingId ? "admin-table-wrap--full" : ""}`}>
          <div className="admin-panel__heading">
            <div>
              <p className="section-eyebrow">مدیریت کاتالوگ</p>
              <h2>گروه‌های محصول فعال</h2>
            </div>
            <span className="status-pill status-pill--success">{filteredItems.length} مورد</span>
          </div>

          {/* Catalog Toolbar: Search and Filter */}
          <div className="admin-catalog-toolbar">
            <div className="admin-search-input">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                placeholder="جستجو در نام محصول، SKU یا طرح…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.82rem", color: "var(--muted)", whiteSpace: "nowrap" }}>دسته:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  minHeight: "2.35rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  background: "#fff",
                  fontSize: "0.85rem",
                }}
              >
                <option value="all">همه دسته‌ها ({items.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
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
              {filteredItems.map((x) => {
                const totalStock = calculateTotalStock(x);
                const primaryMedia = x.media?.find((m) => m.isPrimary)?.publicUrl || x.media?.[0]?.publicUrl;
                return (
                  <tr key={x.id}>
                    <td data-label="گروه محصول">
                      <div className="admin-product-cell">
                        <div className="admin-product-cell__thumb">
                          {primaryMedia ? (
                            <Image src={resolveCmsMediaUrl(primaryMedia)} alt={x.name} fill sizes="44px" unoptimized />
                          ) : (
                            <span>ت</span>
                          )}
                        </div>
                        <div className="admin-product-cell__meta">
                          <span className="admin-product-cell__title">{x.name}</span>
                          <div className="admin-product-cell__sub">
                            {x.color && <span className="admin-chip">رنگ: {x.color}</span>}
                            {x.pattern && <span className="admin-chip">طرح: {x.pattern}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="SKU">
                      <span className="admin-sku-chip">{x.sku}</span>
                    </td>
                    <td data-label="دسته">
                      <span className="admin-category-badge">{x.categoryName}</span>
                    </td>
                    <td data-label="قیمت">
                      {x.compareAtPrice ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", whiteSpace: "nowrap" }}>
                          <s style={{ opacity: 0.65, fontSize: "0.82em", color: "var(--color-muted, #716b64)" }}>
                            {formatPrice(x.compareAtPrice)}
                          </s>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <strong>{formatPrice(x.price)}</strong>
                            {x.discountPercent ? (
                              <span className="status-pill status-pill--danger" style={{ fontSize: "0.72rem", padding: "0.1rem 0.4rem" }}>
                                {x.discountPercent}% تخفیف
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <strong style={{ whiteSpace: "nowrap" }}>{formatPrice(x.price)}</strong>
                      )}
                    </td>
                    <td data-label="موجودی کل">
                      {totalStock > 2 ? (
                        <span className="admin-stock-badge admin-stock-badge--success">
                          {totalStock} عدد
                        </span>
                      ) : totalStock > 0 ? (
                        <span className="admin-stock-badge admin-stock-badge--warning stock-low">
                          {totalStock} عدد (موجودی کم)
                        </span>
                      ) : (
                        <span className="admin-stock-badge admin-stock-badge--danger stock-low">
                          ۰ عدد (ناموجود)
                        </span>
                      )}
                    </td>
                    <td data-label="عملیات">
                      <div className="admin-row-actions">
                        <button type="button" onClick={() => startEditProduct(x)}>
                          ویرایش گروه و ظرفیت‌ها
                        </button>
                        <Link href={`/admin/products/${x.id}/variants`}>ظرفیت‌ها</Link>
                        <Link href={`/admin/products/${x.id}/media`}>گالری تصاویر</Link>
                        <button type="button" className="admin-btn--danger" onClick={() => removeProduct(x.id)}>
                          غیرفعال
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredItems.length === 0 && (
            <div className="admin-empty">
              {searchQuery || selectedCategory !== "all" ? "موردی با این فیلترها یافت نشد." : "محصول فعالی وجود ندارد."}
            </div>
          )}
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
