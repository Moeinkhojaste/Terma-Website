import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { CartProvider } from "@/features/cart/cart-provider";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://terma.ir"),
  title: {
    default: "ترما | سفره‌های ترمه ایرانی",
    template: "%s | ترما",
  },
  description: "سفره‌های ترمه با نقش اصیل ایرانی، دوخت دقیق و آستر ساتن در دسته‌های چهار، شش و هشت نفره.",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ترما",
    title: "ترما | سفره‌های ترمه ایرانی",
    description: "سفره‌های ترمه با نقش اصیل ایرانی، دوخت دقیق و آستر ساتن در دسته‌های چهار، شش و هشت نفره.",
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ترما",
  url: "https://terma.ir",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://terma.ir/products?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ترما",
  url: "https://terma.ir",
  logo: "https://terma.ir/images/terma-logo.webp",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+98-21-12345678",
    contactType: "customer service",
    areaServed: "IR",
    availableLanguage: "Persian",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={cairo.variable} data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
      </head>
      <body className={cairo.className} suppressHydrationWarning>
        <FeedbackProvider>
          <WishlistProvider>
            <CartProvider>
              {children}
              <CartDrawer />
            </CartProvider>
          </WishlistProvider>
        </FeedbackProvider>
      </body>
    </html>
  );
}
