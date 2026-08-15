"use client";
import { useEffect, useState } from "react";
import { AdminShell } from "@/features/admin/admin-shell";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatPrice } from "@/lib/format";

type Report = { fromUtc:string; toUtc:string; orderCount:number; grossSales:number; cancelledSales:number; byStatus:{status:string;count:number;total:number}[] };
export function AdminReportsPage(){
 const [report,setReport]=useState<Report>(); const [error,setError]=useState<string>();
 useEffect(()=>{apiRequest<Report>("/api/admin/reports/sales",{cache:"no-store"}).then(setReport).catch(e=>setError(getApiErrorMessage(e)));},[]);
 return <AdminShell title="گزارش‌ها"><div className="admin-panel"><p className="section-eyebrow">۳۰ روز گذشته</p><h2>گزارش فروش</h2>{error&&<div className="admin-alert admin-alert--error" role="alert">{error}</div>}{report&&<><div className="admin-stats"><div><span>تعداد سفارش</span><strong>{report.orderCount}</strong></div><div><span>فروش خالص</span><strong>{formatPrice(report.grossSales)}</strong></div><div><span>لغوشده</span><strong>{formatPrice(report.cancelledSales)}</strong></div></div><table className="admin-table"><thead><tr><th>وضعیت</th><th>تعداد</th><th>مبلغ</th></tr></thead><tbody>{report.byStatus.map(x=><tr key={x.status}><td>{x.status}</td><td>{x.count}</td><td>{formatPrice(x.total)}</td></tr>)}</tbody></table></>}</div></AdminShell>;
}
