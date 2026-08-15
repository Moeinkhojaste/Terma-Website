"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/features/admin/admin-shell";
import { getApiErrorMessage } from "@/lib/api-client";
import { createCmsPage, listCmsPages } from "@/features/content/cms-api";
import type { CmsPageSummary, CmsStatus } from "@/features/content/cms-types";

const statusLabels: Record<CmsStatus, string> = { Draft: "پیش‌نویس", Scheduled: "زمان‌بندی‌شده", Published: "منتشرشده", Archived: "آرشیو" };

export function AdminCmsPages() {
  const router = useRouter();
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(undefined);
      listCmsPages(search, status)
        .then((result) => { if (active) setPages(result); })
        .catch((e) => { if (active) { setPages([]); setError(getApiErrorMessage(e)); } })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, status, refreshKey]);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setCreating(true); setError(undefined);
    const form = new FormData(event.currentTarget);
    try { const page = await createCmsPage({ name: String(form.get("name")), slug: String(form.get("slug")) }); router.push(`/admin/content/${page.id}`); }
    catch (e) { setError(getApiErrorMessage(e)); setCreating(false); }
  }
  return <AdminShell title="محتوای سایت">
    <div className="cms-admin-intro"><div><h2>صفحات و محتوای عمومی</h2><p>پیش‌نویس را با خیال راحت آماده کنید؛ تا زمان انتشار چیزی در فروشگاه تغییر نمی‌کند.</p></div><Link className="button button--secondary" href="/admin/content/media">کتابخانه رسانه</Link></div>
    {error && <div className="admin-alert admin-alert--error" role="alert"><span>{error}</span><button type="button" className="button button--secondary" onClick={() => setRefreshKey((value) => value + 1)}>تلاش مجدد</button></div>}
    <div className="cms-dashboard-grid">
      <section className="admin-panel cms-page-list" aria-label="صفحات محتوا">
        <div className="cms-list-toolbar"><label><span>جست‌وجوی صفحه</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="نام یا آدرس صفحه" /></label><label><span>وضعیت</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">همه وضعیت‌ها</option><option value="Draft">پیش‌نویس</option><option value="Scheduled">زمان‌بندی‌شده</option><option value="Published">منتشرشده</option><option value="Archived">آرشیو</option></select></label></div>
        {loading ? <div className="admin-empty" role="status">در حال دریافت صفحات…</div> : pages.length === 0 ? <div className="admin-empty">صفحه‌ای با این مشخصات پیدا نشد.</div> : <div className="cms-page-cards">{pages.map((page) => <Link className="cms-page-card" href={`/admin/content/${page.id}`} key={page.id}><div><strong>{page.name}</strong><span dir="ltr">/{page.slug}</span></div><div><span className={`status-pill cms-status--${page.status.toLowerCase()}`}>{statusLabels[page.status]}</span><small>نسخه {new Intl.NumberFormat("fa-IR").format(page.latestRevisionNumber)}</small></div></Link>)}</div>}
      </section>
      <form className="admin-panel admin-form cms-create-page" onSubmit={create}><h2>ساخت صفحه جدید</h2><p>صفحه با یک پیش‌نویس خالی ساخته می‌شود.</p><label className="form-field"><span>نام صفحه</span><input name="name" required maxLength={200} placeholder="مثلاً حریم خصوصی" /></label><label className="form-field"><span>آدرس انگلیسی</span><div className="cms-slug-field"><span>/</span><input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" dir="ltr" placeholder="privacy" /></div><small>فقط حروف انگلیسی کوچک، عدد و خط تیره</small></label><button className="button button--primary" disabled={creating}>{creating ? "در حال ساخت…" : "ساخت و شروع ویرایش"}</button></form>
    </div>
  </AdminShell>;
}
