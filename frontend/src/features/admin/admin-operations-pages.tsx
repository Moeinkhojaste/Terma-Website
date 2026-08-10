"use client";

import { FormEvent, useEffect as reactUseEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import { changeMessageStatus, changeOrderStatus, deleteContent, getContent, getCustomers, getMessages, getOrders, getPromotions, getShippingRules, upsertContent, type AdminCustomer, type AdminOrder, type ContactMessage, type Promotion, type ShippingRule, type StoreContent } from "@/features/admin/store-api";

function useEffect(effect: () => void | Promise<void>, dependencies: unknown[]) { reactUseEffect(() => { void effect(); }, dependencies); }

export function AdminOrdersPage() { const [items, setItems] = useState<AdminOrder[]>([]); const [error, setError] = useState<string>(); const load = () => getOrders().then(setItems).catch((e) => setError(getApiErrorMessage(e))); useEffect(load, []); async function update(id:string,status:string){try{await changeOrderStatus(id,status);load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="سفارش‌ها"><PageError error={error}/><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>شماره</th><th>مشتری</th><th>تلفن</th><th>مبلغ</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td dir="ltr">{x.number}</td><td>{x.customerName}</td><td dir="ltr">{x.phone}</td><td>{formatPrice(x.total)}</td><td><select value={x.status} onChange={e=>update(x.id,e.target.value)} aria-label={`وضعیت سفارش ${x.number}`}><option value="PendingConfirmation">در انتظار بررسی</option><option value="Confirmed">تأیید شده</option><option value="Preparing">در حال آماده‌سازی</option><option value="Shipped">ارسال شده</option><option value="Delivered">تحویل شده</option><option value="Cancelled">لغو شده</option><option value="Expired">منقضی شده</option></select></td><td>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium"}).format(new Date(x.createdAt))}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="هنوز سفارشی ثبت نشده است."/>}</div></AdminShell>; }

export function AdminCustomersPage() { const [items,setItems]=useState<AdminCustomer[]>([]); const [error,setError]=useState<string>(); useEffect(()=>{getCustomers().then(setItems).catch(e=>setError(getApiErrorMessage(e)));},[]); return <AdminShell title="مشتریان"><PageError error={error}/><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>نام</th><th>تلفن</th><th>ایمیل</th><th>تعداد سفارش</th><th>ارزش سفارش‌ها</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.fullName}</td><td dir="ltr">{x.phone}</td><td dir="ltr">{x.email??"—"}</td><td>{x.orderCount}</td><td>{formatPrice(x.totalOrderValue)}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="مشتری‌ای ثبت نشده است."/>}</div></AdminShell>; }

export function AdminMessagesPage() { const [items,setItems]=useState<ContactMessage[]>([]); const [error,setError]=useState<string>(); const load=()=>getMessages().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function update(id:string,status:string){try{await changeMessageStatus(id,status);load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="پیام‌های مشتریان"><PageError error={error}/><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>فرستنده</th><th>موضوع</th><th>پیام</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}<small dir="ltr">{x.phone}</small></td><td>{x.topic}</td><td className="admin-table__message">{x.body}</td><td><select value={x.status} onChange={e=>update(x.id,e.target.value)} aria-label={`وضعیت پیام ${x.topic}`}><option value="New">جدید</option><option value="Read">خوانده‌شده</option><option value="Replied">پاسخ‌داده‌شده</option><option value="Archived">بایگانی</option></select></td><td>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium"}).format(new Date(x.createdAt))}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="پیامی وجود ندارد."/>}</div></AdminShell>; }

export function AdminPromotionsPage() { const [items,setItems]=useState<Promotion[]>([]); const [error,setError]=useState<string>(); const load=()=>getPromotions().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await apiRequest("/api/admin/promotions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),code:f.get("code")||null,type:"Coupon",discountType:"Percentage",value:Number(f.get("value")),startsAtUtc:new Date().toISOString(),isActive:true})});e.currentTarget.reset();load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="تخفیف‌ها"><PageError error={error}/><div className="admin-two-col"><form className="admin-panel admin-form" onSubmit={submit}><h2>کد تخفیف جدید</h2><label className="form-field">عنوان<input name="name" required /></label><label className="form-field">کد<input name="code" required dir="ltr" /></label><label className="form-field">درصد تخفیف<input name="value" type="number" min="1" max="100" required /></label><button className="button button--primary" type="submit">افزودن تخفیف</button></form><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>عنوان</th><th>کد</th><th>مقدار</th><th>مصرف</th><th>وضعیت</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}</td><td dir="ltr">{x.code??"خودکار"}</td><td>{x.discountType==="Percentage"?`${x.value}%`:formatPrice(x.value)}</td><td>{x.usageCount}{x.usageLimit?` / ${x.usageLimit}`:""}</td><td>{x.isActive?"فعال":"غیرفعال"}</td></tr>)}</tbody></table></div></div></AdminShell>; }

export function AdminShippingPage() { const [items,setItems]=useState<ShippingRule[]>([]); const [error,setError]=useState<string>(); const load=()=>getShippingRules().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);try{await apiRequest("/api/admin/shipping-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),province:f.get("province")||null,city:f.get("city")||null,cost:Number(f.get("cost")),priority:Number(f.get("priority")),isActive:true})});e.currentTarget.reset();load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="قوانین ارسال"><PageError error={error}/><div className="admin-two-col"><form className="admin-panel admin-form" onSubmit={submit}><h2>قانون ارسال جدید</h2><label className="form-field">عنوان<input name="name" required /></label><label className="form-field">استان<input name="province" /></label><label className="form-field">شهر<input name="city" /></label><label className="form-field">هزینه<input name="cost" type="number" min="0" required /></label><label className="form-field">اولویت<input name="priority" type="number" defaultValue="10" required /></label><button className="button button--primary" type="submit">افزودن قانون</button></form><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>عنوان</th><th>محدوده</th><th>هزینه</th><th>اولویت</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}</td><td>{[x.province,x.city].filter(Boolean).join("، ")||"همه"}</td><td>{formatPrice(x.cost)}</td><td>{x.priority}</td></tr>)}</tbody></table></div></div></AdminShell>; }

export function AdminContentPage() {
  const [items, setItems] = useState<StoreContent[]>([]);
  const [filterPage, setFilterPage] = useState<string>("all");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [newForm, setNewForm] = useState({ pageKey: "home", sectionKey: "", title: "", body: "", linkUrl: "", imageUrl: "", isPublished: true });

  const load = () => getContent(filterPage === "all" ? undefined : filterPage).then(setItems).catch((e) => setError(getApiErrorMessage(e)));
  useEffect(load, [filterPage]);

  async function save(item: StoreContent) {
    setPending(true);
    setError(undefined);
    try {
      await upsertContent(item);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function createNew(e: FormEvent) {
    e.preventDefault();
    if (!newForm.pageKey || !newForm.sectionKey || !newForm.title || !newForm.body) return;
    setPending(true);
    setError(undefined);
    try {
      await upsertContent({
        pageKey: newForm.pageKey.trim().toLowerCase(),
        sectionKey: newForm.sectionKey.trim().toLowerCase(),
        title: newForm.title.trim(),
        body: newForm.body.trim(),
        linkUrl: newForm.linkUrl ? newForm.linkUrl.trim() : null,
        imageUrl: newForm.imageUrl ? newForm.imageUrl.trim() : null,
        isPublished: newForm.isPublished,
      });
      setNewForm({ pageKey: filterPage === "all" ? "home" : filterPage, sectionKey: "", title: "", body: "", linkUrl: "", imageUrl: "", isPublished: true });
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("آیا از حذف این بخش محتوایی اطمینان دارید؟")) return;
    try {
      await deleteContent(id);
      await load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  const pages = [
    { key: "all", title: "همه صفحات" },
    { key: "home", title: "صفحه اصلی (Home)" },
    { key: "about", title: "درباره ما (About)" },
    { key: "contact", title: "تماس با ما (Contact)" },
    { key: "common", title: "عمومی و فوتر (Common)" },
  ];

  return (
    <AdminShell title="مدیریت محتوای سایت (CMS)">
      <PageError error={error} />
      
      <div className="admin-content-toolbar" style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {pages.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`button ${filterPage === p.key ? "button--primary" : "button--secondary"}`}
            onClick={() => setFilterPage(p.key)}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="admin-two-col">
        <form className="admin-panel admin-form" onSubmit={createNew}>
          <h2>افزودن بخش محتوایی جدید</h2>
          <label className="form-field">
            <span>صفحه (Page Key)</span>
            <select value={newForm.pageKey} onChange={(e) => setNewForm({ ...newForm, pageKey: e.target.value })} required>
              <option value="home">صفحه اصلی (home)</option>
              <option value="about">درباره ما (about)</option>
              <option value="contact">تماس با ما (contact)</option>
              <option value="common">عمومی و فوتر (common)</option>
            </select>
          </label>
          <label className="form-field">
            <span>شناسه بخش (Section Key)</span>
            <input value={newForm.sectionKey} onChange={(e) => setNewForm({ ...newForm, sectionKey: e.target.value })} required placeholder="مثلاً hero, values, story..." dir="ltr" />
          </label>
          <label className="form-field">
            <span>عنوان بخش</span>
            <input value={newForm.title} onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} required placeholder="عنوان قابل نمایش" />
          </label>
          <label className="form-field form-field--full">
            <span>متن توضیحات</span>
            <textarea value={newForm.body} onChange={(e) => setNewForm({ ...newForm, body: e.target.value })} rows={4} required placeholder="متن کامل این بخش..." />
          </label>
          <label className="form-field">
            <span>لینک ارجاع (اختیاری)</span>
            <input value={newForm.linkUrl} onChange={(e) => setNewForm({ ...newForm, linkUrl: e.target.value })} dir="ltr" placeholder="/products یا https://..." />
          </label>
          <label className="form-field"><span>آدرس تصویر (اختیاری)</span><input value={newForm.imageUrl} onChange={(e) => setNewForm({ ...newForm, imageUrl: e.target.value })} dir="ltr" placeholder="/images/..." /></label>
          <label className="admin-check"><input type="checkbox" checked={newForm.isPublished} onChange={(e) => setNewForm({ ...newForm, isPublished: e.target.checked })} /> انتشار در سایت</label>
          <button className="button button--primary" type="submit" disabled={pending}>{pending ? "در حال ثبت…" : "افزودن بخش جدید"}</button>
        </form>

        <div className="admin-content-list" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {items.map((item) => (
            <article className="admin-panel admin-content-editor" key={item.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="status-pill" style={{ marginLeft: "0.5rem" }}>صفحه: {item.pageKey}</span>
                  <span className="status-pill" style={{ marginLeft: "0.5rem" }} dir="ltr">بخش: {item.sectionKey}</span>
                </div>
                <span className={item.isPublished ? "status-pill status-pill--success" : "status-pill"}>{item.isPublished ? "منتشرشده" : "پیش‌نویس"}</span>
              </div>

              <label className="form-field">
                <span>عنوان</span>
                <input
                  defaultValue={item.title}
                  onBlur={(e) => { if (e.target.value !== item.title) save({ ...item, title: e.target.value }); }}
                />
              </label>

              <label className="form-field">
                <span>متن توضیحات</span>
                <textarea
                  rows={3}
                  defaultValue={item.body}
                  onBlur={(e) => { if (e.target.value !== item.body) save({ ...item, body: e.target.value }); }}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <label className="form-field">
                  <span>لینک</span>
                  <input
                    dir="ltr"
                    defaultValue={item.linkUrl ?? ""}
                    onBlur={(e) => save({ ...item, linkUrl: e.target.value || null })}
                  />
                </label>
                <label className="form-field">
                  <span>تصویر</span>
                  <input
                    dir="ltr"
                    defaultValue={item.imageUrl ?? ""}
                    onBlur={(e) => save({ ...item, imageUrl: e.target.value || null })}
                  />
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    defaultChecked={item.isPublished}
                    onChange={(e) => save({ ...item, isPublished: e.target.checked })}
                  />
                  نمایش در سایت
                </label>
                <button type="button" className="button button--secondary" style={{ color: "var(--danger)" }} onClick={() => remove(item.id)}>
                  حذف بخش
                </button>
              </div>
            </article>
          ))}
          {items.length === 0 && <Empty text="هیچ بخش محتوایی در این دسته‌بندی پیدا نشد." />}
        </div>
      </div>
    </AdminShell>
  );
}

function PageError({error}:{error?:string}){return error?<div className="admin-alert admin-alert--error" role="alert">{error}</div>:null} function Empty({text}:{text:string}){return <div className="admin-empty">{text}</div>}
