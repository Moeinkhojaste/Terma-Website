import Image from "next/image";
import Link from "next/link";
import { BagIcon, SearchIcon } from "@/components/icons";
import { Container } from "@/components/container";

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
                sizes="(max-width: 768px) 120px, 160px"
                priority
                quality={95}
              />
            </span>
            <span className="brand-text">
              <strong>ترما</strong>
              <small>TERMA</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="ناوبری اصلی">
            <Link href="#محصولات">محصولات</Link>
            <Link href="#اندازه‌ها">دسته‌بندی ظرفیت</Link>
            <Link href="#داستان-ترما">داستان ترما</Link>
          </nav>
          <div className="header-actions">
            <Link className="icon-button" href="#محصولات" aria-label="جست‌وجوی محصولات"><SearchIcon /></Link>
            <Link className="icon-button cart-button" href="#محصولات" aria-label="سبد خرید، بدون محصول"><BagIcon /><span>۰</span></Link>
          </div>
        </Container>
        <Container className="mobile-nav">
          <nav aria-label="ناوبری موبایل">
            <Link href="#محصولات">محصولات</Link>
            <Link href="#اندازه‌ها">دسته‌بندی</Link>
            <Link href="#داستان-ترما">درباره ترما</Link>
          </nav>
        </Container>
      </header>
    </>
  );
}
