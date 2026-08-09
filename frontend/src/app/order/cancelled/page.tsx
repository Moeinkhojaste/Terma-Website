import type { Metadata } from "next";
import { OrderStatus } from "@/features/orders/order-status";

export const metadata: Metadata = { title: "پرداخت لغوشده | ترما" };

export default function CancelledPage() {
  return <OrderStatus type="cancelled" />;
}
