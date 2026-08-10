import Image from "next/image";
import Link from "next/link";
import { SearchIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { CartLink } from "@/features/cart/cart-link";
import { getPublicContent } from "@/features/content/content-api";

export async function Header() {
  let announcementText = "نقش ایرانی، دوخت دقیق، برای خانه امروز";
  try {
    const commonContent = await getPublicContent("common");
    const found = commonContent.find((x) => x.sectionKey === "header_announcement");
    if (found?.body) {
      announcementText = found.body;
    }
  } catch {
    // Graceful fallback to default announcement text
  }

  return (
    <>
      <div className="announcement">{announcementText}</div>
      <header className="site-header">
        <Container className="header-main">
          <Link className="brand" href="/" aria-label="ترما، صفحه اصلی">
            <span className="brand-mark">
              <Image
                src="/images/terma-logo.jpeg"
                alt="لوگوی ترما"
                fill
                sizes="(max-width: 768px) 160px, 300px"
                priority
                quality={75}
              />
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            <Link href="/products">محصولات</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">ارتباط با ما</Link>
          </nav>
          <div className="header-actions">
            <Link className="icon-button" href="/products" aria-label="جست‌وجوی محصولات">
              <SearchIcon />
            </Link>
            <CartLink />
          </div>
        </Container>
        <Container className="mobile-nav">
          <nav aria-label="ناوبری موبایل">
            <Link href="/products">محصولات</Link>
            <Link href="/about">درباره ما</Link>
            <Link href="/contact">ارتباط با ما</Link>
          </nav>
        </Container>
      </header>
    </>
  );
}
