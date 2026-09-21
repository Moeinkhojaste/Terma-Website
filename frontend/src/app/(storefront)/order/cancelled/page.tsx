import type { Metadata } from "next";
import { OrderStatus } from "@/features/orders/order-status";

export const metadata: Metadata = { title: "سفارش لغوشده | ترما" };

export default async function CancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const orderNumber = order && /^TRM-\d{8}(-\d{6})?$/.test(order) ? order : undefined;
  return <OrderStatus type="cancelled" orderNumber={orderNumber} />;
}
