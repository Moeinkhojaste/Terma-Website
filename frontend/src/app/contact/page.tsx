import type { Metadata } from "next";
import { ContactPage } from "@/features/brand/contact-page";

export const metadata: Metadata = {
  title: "ارتباط با ما | ترما",
  description: "راه‌های ارتباط با ترما برای راهنمایی خرید، پیگیری سفارش، همکاری و پاسخ به پرسش‌ها.",
};

export default function Page() {
  return (
    <ContactPage
      email={process.env.NEXT_PUBLIC_CONTACT_EMAIL}
      phone={process.env.NEXT_PUBLIC_CONTACT_PHONE}
      instagramUrl={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
    />
  );
}
