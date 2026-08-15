import type { Metadata } from "next";
import { AccountOrderClient } from "@/features/account/account-order-client";
export const metadata: Metadata = { title: "جزئیات سفارش | ترما", robots: { index: false, follow: false } };
export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <AccountOrderClient id={id} />; }
