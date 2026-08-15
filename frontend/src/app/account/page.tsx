import type { Metadata } from "next";
import { AccountDashboardClient } from "@/features/account/account-dashboard-client";
export const metadata: Metadata = { title: "سفارش‌های من | ترما", robots: { index: false, follow: false } };
export default function AccountPage() { return <AccountDashboardClient />; }
