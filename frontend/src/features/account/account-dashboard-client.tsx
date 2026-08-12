"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { formatPrice } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { getCustomerOrders, getCustomerSession, logoutCustomer, orderStatusLabels, type CustomerOrderSummary, type CustomerSession } from "./account-api";

export function AccountDashboardClient() {
  const router = useRouter();
  const [session, setSession] = useState<CustomerSession>();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  useEffect(() => {
    Promise.all([getCustomerSession(), getCustomerOrders()])
      .then(([me, list]) => { setSession(me); setOrders(list.items); })
      .catch((caught) => {
        if (caught instanceof ApiError && caught.status === 401) router.replace("/account/login");
        else setError(accountLoadError(caught));
      })
      .finally(() => setLoading(false));
  }, [router, retryKey]);
  function retry() {
    setLoading(true); setError(""); setRetryKey((value) => value + 1);
  }
  async function logout() {
    setLoggingOut(true); setLogoutError("");
    try {
      await logoutCustomer();
      router.replace("/account/login");
      router.refresh();
    } catch (caught) {
      setLoggingOut(false);
      setLogoutError(logoutMessage(caught));
    }
  }
  return <><Header /><main className="commerce-page account-page"><Container>
    <div className="account-heading"><div><p className="section-eyebrow">حساب من</p><h1>سفارش‌های من</h1>{session && <p>شماره تأییدشده: <b dir="ltr">{session.phone}</b></p>}{logoutError && <small className="form-field__error" role="alert">{logoutError}</small>}</div>{session && <button className="button button--secondary" onClick={logout} disabled={loggingOut}>{loggingOut ? "در حال خروج…" : "خروج از حساب"}</button>}</div>
    {loading ? <div className="cart-loading" role="status">در حال دریافت سفارش‌ها…</div> : error ? <div className="account-error account-error--action" role="alert"><span>{error}</span><button type="button" className="button button--secondary" onClick={retry}>تلاش دوباره</button></div> : orders.length === 0 ? <section className="commerce-empty"><h2>هنوز سفارشی ندارید</h2><p>بعد از ثبت سفارش، وضعیت آن را از همین صفحه دنبال کنید.</p><Link className="button button--primary" href="/products">مشاهده محصولات</Link></section> : <div className="account-order-list">{orders.map(order => <Link href={`/account/orders/${order.id}`} className="account-order-card" key={order.id}><div><strong dir="ltr">{order.number}</strong><span>{new Date(order.createdAt).toLocaleDateString("fa-IR")}</span></div><div><span className="status-pill">{orderStatusLabels[order.status]}</span><b>{formatPrice(order.total)}</b><small>{order.itemCount.toLocaleString("fa-IR")} کالا</small></div></Link>)}</div>}
  </Container></main><Footer /></>;
}

function accountLoadError(error: unknown) {
  if (!(error instanceof ApiError)) return "خطای پیش‌بینی‌نشده‌ای رخ داد. دوباره تلاش کنید.";
  if (error.isNetworkError) return "ارتباط با سرویس حساب برقرار نشد. اتصال اینترنت و اجرای API را بررسی کنید.";
  if (error.status === 404) return "سرویس حساب کاربری در API در دسترس نیست. بک‌اند را به‌روز و دوباره اجرا کنید.";
  return "دریافت اطلاعات حساب انجام نشد. چند لحظه دیگر دوباره تلاش کنید.";
}

function logoutMessage(error: unknown) {
  if (!(error instanceof ApiError)) return "خروج از حساب انجام نشد. دوباره تلاش کنید.";
  if (error.isNetworkError) return "ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.";
  return "خروج از حساب انجام نشد. دوباره تلاش کنید.";
}
