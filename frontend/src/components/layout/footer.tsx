import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { getPublicContent } from "@/features/content/content-api";

export async function Footer() {
  let footerTitle = "ترما";
  let footerTagline = "سفره‌های ترمه برای خانه‌های ایرانی امروز";

  try {
    const commonContent = await getPublicContent("common");
    const taglineContent = commonContent.find((x) => x.sectionKey === "footer_tagline");
    if (taglineContent) {
      if (taglineContent.title) footerTitle = taglineContent.title;
      if (taglineContent.body) footerTagline = taglineContent.body;
    }
  } catch {
    // Graceful fallback to default footer texts
  }

  return (
    <footer className="footer" id="تماس">
      <Container className="footer-grid">
        <div className="footer-brand">
          <span className="brand-mark brand-mark--footer">
            <Image
              src="/images/terma-logo.jpeg"
              alt="لوگوی ترما"
              fill
              sizes="(max-width: 768px) 120px, 160px"
              quality={75}
            />
          </span>
          <div>
            <strong>{footerTitle}</strong>
            <p>{footerTagline}</p>
          </div>
        </div>
        <div>
          <h2>راهنمای خرید</h2>
          <Link href="/#راهنمای-خرید">انتخاب اندازه</Link>
          <Link href="/#جزئیات">جنس و دوخت</Link>
          <span>ارسال و مرجوعی — به‌زودی</span>
        </div>
        <div>
          <h2>ارتباط با ترما</h2>
          <Link href="/about">درباره ما</Link>
          <Link href="/contact">ارتباط با ما</Link>
          <Link href="/style-guide">راهنمای سبک داخلی</Link>
        </div>
        <div>
          <h2>قوانین</h2>
          <span>حریم خصوصی — به‌زودی</span>
          <span>شرایط استفاده — به‌زودی</span>
        </div>
      </Container>
      <Container className="footer-bottom">
        <p>© ۱۴۰۵ ترما</p>
        <p>طراحی‌شده با احترام به هنر ایرانی</p>
      </Container>
    </footer>
  );
}
