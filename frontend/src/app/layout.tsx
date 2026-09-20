import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { CartProvider } from "@/features/cart/cart-provider";
import { CartDrawer } from "@/features/cart/cart-drawer";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ترما | سفره‌های اصیل ایرانی و طرح ترمه (۴، ۶ و ۸ نفره)",
    template: "%s | ترما",
  },
  description: "سفره‌های پذیرایی و غذاخوری با نقش و طرح اصیل ترمه، دوخت منظم و آستر ساتن در اندازه‌های ۴، ۶ و ۸ نفره.",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ترما",
    title: "ترما | سفره‌های اصیل ایرانی و طرح ترمه (۴، ۶ و ۸ نفره)",
    description: "سفره‌های پذیرایی و غذاخوری با نقش و طرح اصیل ترمه، دوخت منظم و آستر ساتن در اندازه‌های ۴، ۶ و ۸ نفره.",
    url: siteUrl,
  },
  other: {
    enamad: "8428039",
  },
};

const websiteStructuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ترما",
  url: siteUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/products?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ترما",
  url: siteUrl,
  logo: `${siteUrl}/images/terma-logo.webp`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+98-21-88888888",
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
