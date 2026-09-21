import type { Metadata } from "next";
import { OrderStatus } from "@/features/orders/order-status";

export const metadata: Metadata = { title: "سفارش ثبت شد | ترما" };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string; refId?: string }> }) {
  const { order, refId } = await searchParams;
  const orderNumber = order && /^TRM-\d{8}(-\d{6})?$/.test(order) ? order : undefined;
  const cleanRefId = refId && /^\d+$/.test(refId) ? refId : undefined;
  return <OrderStatus type="success" orderNumber={orderNumber} refId={cleanRefId} />;
}
