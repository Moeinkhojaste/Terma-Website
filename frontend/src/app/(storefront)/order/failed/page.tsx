import type { Metadata } from "next";
import { OrderStatus } from "@/features/orders/order-status";

export const metadata: Metadata = { title: "ثبت سفارش ناموفق | ترما" };

export default async function FailedPage({ searchParams }: { searchParams: Promise<{ order?: string; message?: string }> }) {
  const { order, message } = await searchParams;
  const orderNumber = order && /^TRM-\d{8}(-\d{6})?$/.test(order) ? order : undefined;
  return <OrderStatus type="failed" orderNumber={orderNumber} failureMessage={message} />;
}
