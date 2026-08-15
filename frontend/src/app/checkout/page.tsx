import type { Metadata } from "next";
import { CheckoutPageClient } from "@/features/checkout/checkout-page-client";

export const metadata: Metadata = {
  title: "تکمیل سفارش | ترما",
  description: "اطلاعات گیرنده، آدرس ارسال و خلاصه سفارش ترما.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
