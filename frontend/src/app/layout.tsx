import type { Metadata } from "next";
import { Cairo, Vazirmatn } from "next/font/google";
import { CartProvider } from "@/features/cart/cart-provider";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
  fallback: ["Cairo", "Tahoma", "sans-serif"],
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
  fallback: ["Vazirmatn", "Tahoma", "sans-serif"],
});

export const metadata: Metadata = {
  title: "ترما | سفره‌های ترمه ایرانی",
  description: "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن در دسته‌های چهار، شش و هشت نفره.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${cairo.variable}`}>
      <body className={vazirmatn.className}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

