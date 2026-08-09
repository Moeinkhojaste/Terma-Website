import type { Metadata } from "next";
import { CartPageClient } from "@/features/cart/cart-page-client";

export const metadata: Metadata = {
  title: "سبد خرید | ترما",
  description: "محصولات انتخاب‌شده، تعداد و خلاصه سبد خرید ترما.",
};

export default function CartPage() {
  return <CartPageClient />;
}
