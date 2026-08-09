import type { Metadata } from "next";
import { OrderStatus } from "@/components/order-status";

export const metadata: Metadata = { title: "سفارش ثبت شد | ترما" };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  const orderNumber = order && /^TRM-\d{8}$/.test(order) ? order : undefined;
  return <OrderStatus type="success" orderNumber={orderNumber} />;
}
