import type { Metadata } from "next";
import { CheckoutPageClient } from "@/components/checkout-page-client";

export const metadata: Metadata = {
  title: "تکمیل سفارش | ترما",
  description: "اطلاعات گیرنده، آدرس ارسال و خلاصه سفارش ترما.",
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ simulate?: string }> }) {
  const { simulate } = await searchParams;
  return <CheckoutPageClient simulation={simulate} />;
}
