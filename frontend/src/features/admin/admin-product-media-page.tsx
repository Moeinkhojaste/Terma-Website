"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { createProductMedia, deleteProductMedia, getProductMedia, updateProductMedia, type ProductMedia, type ProductMediaInput, type ProductMediaKind } from "@/features/admin/store-api";
import { listCmsMedia, uploadCmsMedia } from "@/features/content/cms-api";
import { resolveCmsMediaUrl } from "@/features/content/cms-renderer";
import type { MediaAsset } from "@/features/content/cms-types";
import { getApiErrorMessage } from "@/lib/api-client";

const kinds: { value: ProductMediaKind; label: string }[] = [
  { value: "Full", label: "نمای کامل" }, { value: "Table", label: "روی میز" }, { value: "Folded", label: "نمای تاشده" },
  { value: "Texture", label: "بافت پارچه" }, { value: "Stitching", label: "جزئیات دوخت" }, { value: "Lining", label: "آستر پشت" }, { value: "Other", label: "نمای دیگر" },
];
const requiredKinds = kinds.filter((kind) => kind.value !== "Other");
const emptyForm: ProductMediaInput = { publicUrl: "", altText: "", kind: "Full", sortOrder: 0, isPrimary: false };

export function AdminProductMediaPage() {
  const { id } = useParams<{ id: string }>();
  const [media, setMedia] = useState<ProductMedia[]>([]); const [library, setLibrary] = useState<MediaAsset[]>([]);
  const [form, setForm] = useState<ProductMediaInput>(emptyForm); const [editingId, setEditingId] = useState<string>();
  const [pending, setPending] = useState(false); const [error, setError] = useState<string>();
  const load = useCallback(async () => { try { const [productMedia, assets] = await Promise.all([getProductMedia(id), listCmsMedia()]); setMedia(productMedia); setLibrary(assets); } catch (caught) { setError(getApiErrorMessage(caught)); } }, [id]);
  useEffect(() => {
    let active = true;
    Promise.all([getProductMedia(id), listCmsMedia()])
      .then(([productMedia, assets]) => { if (active) { setMedia(productMedia); setLibrary(assets); } })
      .catch((caught: unknown) => { if (active) setError(getApiErrorMessage(caught)); });
    return () => { active = false; };
  }, [id]);
  const reset = () => { setEditingId(undefined); setForm({ ...emptyForm, sortOrder: media.length }); };
  async function save(event: FormEvent) { event.preventDefault(); setPending(true); setError(undefined); try { if (editingId) await updateProductMedia(editingId, form); else await createProductMedia(id, form); reset(); await load(); } catch (caught) { setError(getApiErrorMessage(caught)); } finally { setPending(false); } }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const formElement = event.currentTarget;
    try {
      const formData = new FormData(formElement);
      const name = (formData.get("name") as string)?.trim();
      const altText = (formData.get("altText") as string)?.trim();
      if (!altText && name) {
        formData.set("altText", name);
      }
      const asset = await uploadCmsMedia(formData);
      formElement.reset();
      setLibrary((current) => [asset, ...current]);
      setForm((current) => ({ ...current, publicUrl: asset.publicUrl, altText: asset.altText }));
    } catch (caught) {
      setError(getApiErrorMessage(caught));
    } finally {
      setPending(false);
    }
  }
  async function remove(item: ProductMedia) { if (!window.confirm("این تصویر از گالری محصول حذف شود؟ فایل اصلی در کتابخانه رسانه باقی می‌ماند.")) return; try { await deleteProductMedia(item.id); await load(); } catch (caught) { setError(getApiErrorMessage(caught)); } }
  const missing = requiredKinds.filter((kind) => !media.some((item) => item.kind === kind.value));

  return <AdminShell title="گالری محصول"><div className="admin-product-media-top"><Link className="button button--secondary" href="/admin/products">بازگشت به محصولات</Link><div><strong>تصاویر ناقص:</strong>{missing.length === 0 ? <span className="status-pill status-pill--success">همه نماهای اصلی ثبت شده‌اند</span> : missing.map((kind) => <span className="status-pill" key={kind.value}>{kind.label}</span>)}</div></div>{error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
    <div className="admin-product-media-layout">
      <div className="admin-content-list">
        <form className="admin-panel admin-form" onSubmit={upload}><h2>آپلود عکس واقعی</h2><label className="form-field"><span>فایل تصویر</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /></label><label className="form-field"><span>نام تصویر</span><input name="name" required maxLength={240} /></label><label className="form-field"><span>توضیح تصویر</span><textarea name="altText" maxLength={500} rows={3} placeholder="در صورت خالی بودن، از نام تصویر استفاده می‌شود" /></label><button type="submit" className="button button--secondary" disabled={pending}>آپلود و انتخاب تصویر</button></form>
        <form className="admin-panel admin-form" onSubmit={save}><h2>{editingId ? "ویرایش تصویر گالری" : "افزودن به گالری محصول"}</h2><label className="form-field"><span>انتخاب از کتابخانه</span><select value={form.publicUrl} onChange={(event) => { const asset = library.find((item) => item.publicUrl === event.target.value); setForm((current) => ({ ...current, publicUrl: event.target.value, altText: asset?.altText ?? current.altText })); }} required><option value="">انتخاب تصویر</option>{library.map((asset) => <option value={asset.publicUrl} key={asset.id}>{asset.name}</option>)}</select></label><label className="form-field"><span>نوع نما</span><select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as ProductMediaKind }))}>{kinds.map((kind) => <option value={kind.value} key={kind.value}>{kind.label}</option>)}</select></label><label className="form-field"><span>توضیح جایگزین</span><textarea value={form.altText} onChange={(event) => setForm((current) => ({ ...current, altText: event.target.value }))} required maxLength={300} rows={3} /></label><label className="form-field"><span>ترتیب نمایش</span><input type="number" min="0" inputMode="numeric" value={form.sortOrder} onChange={(event) => setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} /></label><label className="admin-check"><input type="checkbox" checked={form.isPrimary} onChange={(event) => setForm((current) => ({ ...current, isPrimary: event.target.checked }))} /> تصویر اصلی محصول</label><div className="admin-row-actions"><button type="submit" className="button button--primary" disabled={pending}>{pending ? "در حال ذخیره…" : "ذخیره تصویر"}</button>{editingId && <button className="button button--secondary" type="button" onClick={reset}>لغو ویرایش</button>}</div></form>
      </div>
      <section className="admin-panel"><div className="admin-panel__heading"><div><p className="section-eyebrow">تصاویر واقعی محصول</p><h2>گالری فعلی</h2></div><span className="status-pill">{new Intl.NumberFormat("fa-IR").format(media.length)} تصویر</span></div>{media.length === 0 ? <div className="admin-empty">هنوز تصویری برای این محصول ثبت نشده است. فروشگاه از تصاویر واقعی ثابت فعلی استفاده می‌کند.</div> : <div className="admin-product-media-grid">{media.map((item) => <article key={item.id}><div className="cms-media-thumb"><Image src={resolveCmsMediaUrl(item.publicUrl)} alt={item.altText} fill sizes="240px" unoptimized loader={({ src }) => src} /></div><div><strong>{kinds.find((kind) => kind.value === item.kind)?.label ?? item.kind}</strong>{item.isPrimary && <span className="status-pill status-pill--success">اصلی</span>}<p>{item.altText}</p></div><div className="admin-row-actions"><button type="button" onClick={() => { setEditingId(item.id); setForm({ publicUrl: item.publicUrl, altText: item.altText, kind: item.kind, sortOrder: item.sortOrder, isPrimary: item.isPrimary }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>ویرایش</button><button type="button" onClick={() => void remove(item)}>حذف</button></div></article>)}</div>}</section>
    </div>
  </AdminShell>;
}
