import type { Metadata } from "next";
import { AccountOrdersClient } from "@/features/account/account-orders-client";

export const metadata: Metadata = {
  title: "سفارش‌های من | ترما",
  robots: { index: false, follow: false },
};

export default function AccountOrdersPage() {
  return <AccountOrdersClient />;
}
