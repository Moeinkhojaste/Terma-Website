import type { Metadata } from "next";
import { OrderStatus } from "@/features/orders/order-status";

export const metadata: Metadata = { title: "پرداخت ناموفق | ترما" };

export default function FailedPage() {
  return <OrderStatus type="failed" />;
}
