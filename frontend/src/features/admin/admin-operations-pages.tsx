"use client";

import { Fragment, FormEvent, useEffect as reactUseEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";
import { changeMessageStatus, changeOrderStatus, getCustomers, getMessages, getOrders, getPromotions, getShippingRules, type AdminCustomer, type AdminOrder, type ContactMessage, type Promotion, type ShippingRule } from "@/features/admin/store-api";
import { CheckIcon, DocumentTextIcon, MapPinIcon, PackageIcon, ShoppingCartIcon } from "@/components/ui/icons";

function useEffect(effect: () => void | Promise<void>, dependencies: unknown[]) { reactUseEffect(() => { void effect(); }, dependencies); }

export function AdminOrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [trackingSaved, setTrackingSaved] = useState<Record<string, boolean>>({});

  const load = () =>
    getOrders()
      .then((data) => {
        setItems(data);
        const map: Record<string, string> = {};
        data.forEach((o) => {
          if (o.postalTrackingCode) map[o.id] = o.postalTrackingCode;
        });
        setTrackingInputs((prev) => ({ ...map, ...prev }));
      })
      .catch((e) => setError(getApiErrorMessage(e)));

  useEffect(load, []);

  async function update(id: string, status: string) {
    try {
      await changeOrderStatus(id, status, trackingInputs[id]);
      load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  async function saveTracking(id: string, currentStatus: string) {
    try {
      await changeOrderStatus(id, currentStatus, trackingInputs[id] || "");
      setTrackingSaved((prev) => ({ ...prev, [id]: true }));
      setTimeout(() => setTrackingSaved((prev) => ({ ...prev, [id]: false })), 3000);
      load();
    } catch (e) {
      setError(getApiErrorMessage(e));
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <AdminShell title="سفارش‌ها">
      <PageError error={error} />
      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>شماره</th>
              <th>مشتری</th>
              <th>تلفن</th>
              <th>مبلغ</th>
              <th>وضعیت</th>
              <th>تاریخ و ساعت ثبت</th>
              <th>کد رهگیری</th>
              <th>جزئیات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => {
              const isExpanded = expandedId === x.id;
              const formattedDate = new Intl.DateTimeFormat("fa-IR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(x.createdAt));

              return (
                <Fragment key={x.id}>
                  <tr>
                    <td dir="ltr">{x.number}</td>
                    <td>{x.customerName}</td>
                    <td dir="ltr">{x.phone}</td>
                    <td>{formatPrice(x.total)}</td>
                    <td>
                      <select
                        value={x.status}
                        onChange={(e) => update(x.id, e.target.value)}
                        aria-label={`وضعیت سفارش ${x.number}`}
                      >
                        <option value="PendingConfirmation">در انتظار بررسی</option>
                        <option value="Confirmed">تأیید شده</option>
                        <option value="Preparing">در حال آماده‌سازی</option>
                        <option value="Shipped">ارسال شده</option>
                        <option value="Delivered">تحویل شده</option>
                        <option value="Cancelled">لغو شده</option>
                        <option value="Expired">منقضی شده</option>
                      </select>
                    </td>
                    <td dir="rtl">{formattedDate}</td>
                    <td>
                      {x.postalTrackingCode ? (
                        <span dir="ltr" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f766e" }}>
                          {x.postalTrackingCode}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button button--secondary"
                        onClick={() => toggleExpand(x.id)}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.85rem" }}
                      >
                        {isExpanded ? "بستن" : "نمایش"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, backgroundColor: "var(--surface-subtle, #f9fafb)" }}>
                        <div style={{ padding: "1rem 1.25rem", borderBottom: "2px solid var(--line, #e5e7eb)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1rem" }}>
                            <div style={{ background: "#fff", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line, #e5e7eb)" }}>
                              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--brand-deep, #1e293b)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <MapPinIcon className="size-4" /> آدرس ارسال
                              </h4>
                              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6", color: "#334155" }}>
                                <strong>استان:</strong> {x.province} | <strong>شهر:</strong> {x.city}<br />
                                <strong>نشانی دقیق:</strong> {x.address}<br />
                                <strong>کد پستی:</strong> <span dir="ltr">{x.postalCode}</span>
                              </p>
                            </div>
                            <div style={{ background: "#fff", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line, #e5e7eb)" }}>
                              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--brand-deep, #1e293b)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <DocumentTextIcon className="size-4" /> توضیحات خریدار
                              </h4>
                              <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: "1.6", color: x.customerNotes ? "#0f172a" : "#94a3b8" }}>
                                {x.customerNotes || "توضیحاتی برای این سفارش ثبت نشده است."}
                              </p>
                            </div>
                            <div style={{ background: "#fff", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line, #e5e7eb)" }}>
                              <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.95rem", color: "var(--brand-deep, #1e293b)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <PackageIcon className="size-4" /> کد رهگیری مرسوله پستی
                              </h4>
                              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                                <input
                                  type="text"
                                  dir="ltr"
                                  placeholder="کد ۲۴ رقمی پست..."
                                  value={trackingInputs[x.id] ?? x.postalTrackingCode ?? ""}
                                  onChange={(e) => setTrackingInputs((prev) => ({ ...prev, [x.id]: e.target.value }))}
                                  style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.85rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                />
                                <button
                                  type="button"
                                  className="button button--primary"
                                  onClick={() => saveTracking(x.id, x.status)}
                                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                                >
                                  {trackingSaved[x.id] ? <><CheckIcon className="size-3.5" /> ثبت شد</> : "ثبت کد"}
                                </button>
                              </div>
                              <small style={{ display: "block", marginTop: "0.4rem", color: "#64748b", fontSize: "0.75rem" }}>
                                این کد در پنل کاربر نمایش داده خواهد شد.
                              </small>
                            </div>
                          </div>
                          <div style={{ background: "#fff", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--line, #e5e7eb)" }}>
                            <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "var(--brand-deep, #1e293b)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <ShoppingCartIcon className="size-4" /> اقلام سفارش ({x.items.length} محصول)
                            </h4>
                            <table className="admin-table" style={{ width: "100%", margin: 0, fontSize: "0.85rem" }}>
                              <thead>
                                <tr>
                                  <th>نام محصول</th>
                                  <th>نسخه (ظرفیت سفره)</th>
                                  <th>کد محصول (SKU)</th>
                                  <th>قیمت واحد</th>
                                  <th>تعداد</th>
                                  <th>جمع کل</th>
                                </tr>
                              </thead>
                              <tbody>
                                {x.items.map((item, idx) => {
                                  const versionLabel = item.variantTitle || (item.tableCapacity ? `${item.tableCapacity} نفره` : "—");
                                  return (
                                    <tr key={idx}>
                                      <td>
                                        <strong>{item.productName}</strong>
                                        {versionLabel !== "—" && (
                                          <span style={{ marginRight: "0.5rem", padding: "0.15rem 0.45rem", borderRadius: "4px", backgroundColor: "#e2e8f0", color: "#1e293b", fontSize: "0.75rem", fontWeight: 600 }}>
                                            {versionLabel}
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        <strong style={{ color: "#0f766e" }}>{versionLabel}</strong>
                                      </td>
                                      <td dir="ltr">{item.sku}</td>
                                      <td>{formatPrice(item.unitPrice)}</td>
                                      <td>{item.quantity}</td>
                                      <td><strong>{formatPrice(item.unitPrice * item.quantity)}</strong></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 && <Empty text="هنوز سفارشی ثبت نشده است." />}
      </div>
    </AdminShell>
  );
}

export function AdminCustomersPage() { const [items,setItems]=useState<AdminCustomer[]>([]); const [error,setError]=useState<string>(); useEffect(()=>{getCustomers().then(setItems).catch(e=>setError(getApiErrorMessage(e)));},[]); return <AdminShell title="مشتریان"><PageError error={error}/><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>نام</th><th>تلفن</th><th>ایمیل</th><th>تعداد سفارش</th><th>ارزش سفارش‌ها</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.fullName}</td><td dir="ltr">{x.phone}</td><td dir="ltr">{x.email??"—"}</td><td>{x.orderCount}</td><td>{formatPrice(x.totalOrderValue)}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="مشتری‌ای ثبت نشده است."/>}</div></AdminShell>; }

export function AdminMessagesPage() { const [items,setItems]=useState<ContactMessage[]>([]); const [error,setError]=useState<string>(); const load=()=>getMessages().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function update(id:string,status:string){try{await changeMessageStatus(id,status);load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="پیام‌های مشتریان"><PageError error={error}/><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>فرستنده</th><th>موضوع</th><th>پیام</th><th>وضعیت</th><th>تاریخ</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}<small dir="ltr">{x.phone}</small></td><td>{x.topic}</td><td className="admin-table__message">{x.body}</td><td><select value={x.status} onChange={e=>update(x.id,e.target.value)} aria-label={`وضعیت پیام ${x.topic}`}><option value="New">جدید</option><option value="Read">خوانده‌شده</option><option value="Replied">پاسخ‌داده‌شده</option><option value="Archived">بایگانی</option></select></td><td>{new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium"}).format(new Date(x.createdAt))}</td></tr>)}</tbody></table>{items.length===0&&<Empty text="پیامی وجود ندارد."/>}</div></AdminShell>; }

export function AdminPromotionsPage() { const [items,setItems]=useState<Promotion[]>([]); const [error,setError]=useState<string>(); const load=()=>getPromotions().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const formElement=e.currentTarget;const f=new FormData(formElement);try{await apiRequest("/api/admin/promotions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),code:f.get("code")||null,type:"Coupon",discountType:"Percentage",value:Number(f.get("value")),startsAtUtc:new Date().toISOString(),isActive:true})});formElement.reset();load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="تخفیف‌ها"><PageError error={error}/><div className="admin-two-col"><form className="admin-panel admin-form" onSubmit={submit}><h2>کد تخفیف جدید</h2><label className="form-field">عنوان<input name="name" required /></label><label className="form-field">کد<input name="code" required dir="ltr" /></label><label className="form-field">درصد تخفیف<input name="value" type="number" min="1" max="100" required /></label><button className="button button--primary" type="submit">افزودن تخفیف</button></form><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>عنوان</th><th>کد</th><th>مقدار</th><th>مصرف</th><th>وضعیت</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}</td><td dir="ltr">{x.code??"خودکار"}</td><td>{x.discountType==="Percentage"?`${x.value}%`:formatPrice(x.value)}</td><td>{x.usageCount}{x.usageLimit?` / ${x.usageLimit}`:""}</td><td>{x.isActive?"فعال":"غیرفعال"}</td></tr>)}</tbody></table></div></div></AdminShell>; }

export function AdminShippingPage() { const [items,setItems]=useState<ShippingRule[]>([]); const [error,setError]=useState<string>(); const load=()=>getShippingRules().then(setItems).catch(e=>setError(getApiErrorMessage(e))); useEffect(load,[]); async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const formElement=e.currentTarget;const f=new FormData(formElement);try{await apiRequest("/api/admin/shipping-rules",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:f.get("name"),province:f.get("province")||null,city:f.get("city")||null,cost:Number(f.get("cost")),priority:Number(f.get("priority")),isActive:true})});formElement.reset();load();}catch(e){setError(getApiErrorMessage(e));}} return <AdminShell title="قوانین ارسال"><PageError error={error}/><div className="admin-two-col"><form className="admin-panel admin-form" onSubmit={submit}><h2>قانون ارسال جدید</h2><label className="form-field">عنوان<input name="name" required /></label><label className="form-field">استان<input name="province" /></label><label className="form-field">شهر<input name="city" /></label><label className="form-field">هزینه<input name="cost" type="number" min="0" required /></label><label className="form-field">اولویت<input name="priority" type="number" defaultValue="10" required /></label><button className="button button--primary" type="submit">افزودن قانون</button></form><div className="admin-panel admin-table-wrap"><table className="admin-table"><thead><tr><th>عنوان</th><th>محدوده</th><th>هزینه</th><th>اولویت</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.name}</td><td>{[x.province,x.city].filter(Boolean).join("، ")||"همه"}</td><td>{formatPrice(x.cost)}</td><td>{x.priority}</td></tr>)}</tbody></table></div></div></AdminShell>; }

function PageError({error}:{error?:string}){return error?<div className="admin-alert admin-alert--error" role="alert">{error}</div>:null} function Empty({text}:{text:string}){return <div className="admin-empty">{text}</div>}
