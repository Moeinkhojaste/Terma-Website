import Image from "next/image";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { Container } from "@/components/container";
import { CartLink } from "@/components/cart-link";

export function Header() {
  return (
    <>
      <div className="announcement">نقش ایرانی، دوخت دقیق، برای خانه امروز</div>
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
            <Link href="/products#دسته‌بندی">دسته‌بندی ظرفیت</Link>
            <Link href="/#داستان-ترما">داستان ترما</Link>
          </nav>
          <div className="header-actions">
            <Link className="icon-button" href="/products" aria-label="جست‌وجوی محصولات"><SearchIcon /></Link>
            <CartLink />
          </div>
        </Container>
        <Container className="mobile-nav">
          <nav aria-label="ناوبری موبایل">
            <Link href="/products">محصولات</Link>
            <Link href="/products#دسته‌بندی">دسته‌بندی</Link>
            <Link href="/#داستان-ترما">درباره ترما</Link>
          </nav>
        </Container>
      </header>
    </>
  );
}
