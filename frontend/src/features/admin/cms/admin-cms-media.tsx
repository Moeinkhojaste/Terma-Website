"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { getApiErrorMessage } from "@/lib/api-client";
import { deleteCmsMedia, listCmsMedia, updateCmsMedia, uploadCmsMedia } from "@/features/content/cms-api";
import { resolveCmsMediaUrl } from "@/features/content/cms-renderer";
import type { MediaAsset } from "@/features/content/cms-types";

export function AdminCmsMedia() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const load = useCallback(() => listCmsMedia(search).then(setItems).catch((e) => setError(getApiErrorMessage(e))), [search]);
  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);
  async function upload(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(undefined); try { await uploadCmsMedia(new FormData(event.currentTarget)); event.currentTarget.reset(); await load(); } catch (e) { setError(getApiErrorMessage(e)); } finally { setPending(false); } }
  async function update(item: MediaAsset, name: string, altText: string) { try { const result = await updateCmsMedia(item.id, { name, altText }); setItems((current) => current.map((value) => value.id === item.id ? result : value)); } catch (e) { setError(getApiErrorMessage(e)); } }
  async function remove(item: MediaAsset) { if (!window.confirm(`تصویر «${item.name}» حذف شود؟`)) return; try { await deleteCmsMedia(item.id); setItems((current) => current.filter((value) => value.id !== item.id)); } catch (e) { setError(getApiErrorMessage(e)); } }
  return <AdminShell title="کتابخانه رسانه"><div className="cms-editor-top"><Link href="/admin/content" className="text-link">بازگشت به محتوا</Link></div>{error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}<div className="cms-media-layout"><form className="admin-panel admin-form" onSubmit={upload}><h2>آپلود تصویر</h2><label className="form-field"><span>فایل تصویر</span><input name="file" type="file" accept="image/jpeg,image/png,image/webp" required /><small>JPEG، PNG یا WebP، حداکثر ۱۰ مگابایت</small></label><label className="form-field"><span>نام تصویر</span><input name="name" required maxLength={240} /></label><label className="form-field"><span>توضیح تصویر</span><textarea name="altText" required maxLength={500} rows={3} /><small>تصویر را برای کاربری که آن را نمی‌بیند توصیف کنید.</small></label><button className="button button--primary" disabled={pending}>{pending ? "در حال آپلود…" : "آپلود تصویر"}</button></form><section className="admin-panel cms-media-library"><label className="form-field"><span>جست‌وجوی تصویر</span><input value={search} onChange={(e) => setSearch(e.target.value)} /></label>{items.length === 0 ? <div className="admin-empty">تصویری پیدا نشد.</div> : <div className="cms-media-grid">{items.map((item) => <article key={item.id}><div className="cms-media-thumb"><Image src={resolveCmsMediaUrl(item.publicUrl)} alt={item.altText} fill sizes="220px" unoptimized loader={({ src }) => src} /></div><label className="form-field"><span>نام</span><input defaultValue={item.name} onBlur={(e) => { if (e.target.value !== item.name) void update(item, e.target.value, item.altText); }} /></label><label className="form-field"><span>توضیح تصویر</span><textarea defaultValue={item.altText} rows={2} onBlur={(e) => { if (e.target.value !== item.altText) void update(item, item.name, e.target.value); }} /></label><div><small>{(item.length / 1024).toLocaleString("fa-IR", { maximumFractionDigits: 0 })} کیلوبایت</small><button type="button" onClick={() => remove(item)}>حذف</button></div></article>)}</div>}</section></div></AdminShell>;
}
