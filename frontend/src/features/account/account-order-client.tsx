"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { formatPrice } from "@/lib/format";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";
import { getCustomerOrder, orderStatusLabels, type CustomerOrderDetails } from "./account-api";

export function AccountOrderClient({ id }: { id: string }) {
  const router = useRouter(); const [order, setOrder] = useState<CustomerOrderDetails>(); const [error, setError] = useState("");
  useEffect(() => { getCustomerOrder(id).then(setOrder).catch(caught => { if (caught instanceof ApiError && caught.status === 401) router.replace("/account/login"); else setError(getApiErrorMessage(caught)); }); }, [id, router]);
  return <><Header /><main className="commerce-page account-page"><Container>
    <nav className="breadcrumbs commerce-breadcrumbs"><Link href="/account">سفارش‌های من</Link><span>/</span><span>جزئیات سفارش</span></nav>
    {error ? <div className="account-error" role="alert">{error}</div> : !order ? <div className="cart-loading" role="status">در حال دریافت سفارش…</div> : <>
      <div className="account-heading"><div><p className="section-eyebrow">جزئیات سفارش</p><h1 dir="ltr">{order.number}</h1><p>{new Date(order.createdAt).toLocaleString("fa-IR")}</p></div><span className="status-pill">{orderStatusLabels[order.status]}</span></div>
      <div className="account-detail-grid"><section className="checkout-panel"><h2>کالاها</h2>{order.items.map(item => <div className="account-line" key={`${item.productId}-${item.variantId ?? "base"}`}><div><strong>{item.productName}</strong><small dir="ltr">{item.sku}</small></div><span>{item.quantity.toLocaleString("fa-IR")} × {formatPrice(item.unitPrice)}</span><b>{formatPrice(item.lineTotal)}</b></div>)}</section>
      <aside className="checkout-panel"><h2>خلاصه و آدرس</h2><dl className="account-totals"><div><dt>جمع کالاها</dt><dd>{formatPrice(order.subtotal)}</dd></div><div><dt>تخفیف</dt><dd>{formatPrice(order.discountTotal)}</dd></div><div><dt>ارسال</dt><dd>{formatPrice(order.shippingTotal)}</dd></div><div><dt>مبلغ کل</dt><dd><b>{formatPrice(order.total)}</b></dd></div></dl><address>{order.fullName}<br />{order.province}، {order.city}<br />{order.address}<br />کدپستی: <span dir="ltr">{order.postalCode}</span></address></aside></div>
    </>}
  </Container></main><Footer /></>;
}
