import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { CartProvider } from "@/features/cart/cart-provider";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ترما | سفره‌های ترمه ایرانی",
  description: "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن در دسته‌های چهار، شش و هشت نفره.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={cairo.variable}>
      <body className={cairo.className}><CartProvider>{children}</CartProvider></body>
    </html>
  );
}
