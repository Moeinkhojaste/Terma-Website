import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/features/products/components/product-card";
import { SectionHeader } from "@/components/ui/section-header";
import { listProducts } from "@/features/products/product-api";
import type { Product } from "@/features/products/models";
import Link from "next/link";

const colors = [
  ["پس‌زمینه", "#F7F2E8", "var(--ivory)"],
  ["سطح", "#FFFDFC", "var(--surface)"],
  ["ذغالی", "#24211E", "var(--charcoal)"],
  ["سبز ترما", "#145A55", "var(--teal)"],
  ["طلایی", "#B58A4A", "var(--gold)"],
  ["مسی", "#AA4F2D", "var(--copper)"],
];

export default async function StyleGuide() {
  let products: Product[] = [];
  try {
    products = (await listProducts({ pageSize: 2 })).items;
  } catch {
    // The style guide remains usable while the separate API is unavailable.
  }

  return (
    <main className="style-guide">
      <Container>
        <nav className="style-guide-nav"><Link href="/">بازگشت به خانه</Link><span>راهنمای سبک داخلی ترما</span></nav>
        <header className="style-guide-hero"><p>TERMA UI 01</p><h1>زبان بصری ترما</h1><span>نسخه نخست · ۱۴۰۵</span></header>

        <section>
          <SectionHeader eyebrow="01 — رنگ" title="گرم، آرام و نزدیک به محصول" />
          <div className="swatch-grid">{colors.map(([name, hex, color]) => <article key={name}><div style={{ background: color }} /><strong>{name}</strong><span>{hex}</span></article>)}</div>
        </section>

        <section>
          <SectionHeader eyebrow="02 — نوشتار" title="تایپوگرافی فارسی" />
          <div className="type-samples"><h2>نقش ایرانی برای خانه امروز</h2><h3>سفره ترمه نیلا</h3><p>متن فارسی با فونت قاهره (Cairo)، فاصله‌گذاری روشن و ارتفاع خط مناسب خوانده می‌شود.</p><span>۱۲۳۴۵۶۷۸۹۰ · ۱٬۵۰۰٬۰۰۰ تومان</span></div>
        </section>

        <section>
          <SectionHeader eyebrow="03 — کنترل‌ها" title="دکمه‌ها و وضعیت‌ها" />
          <div className="button-states"><Button>دکمه اصلی</Button><Button variant="secondary">دکمه دوم</Button><Button variant="quiet">دکمه ساده</Button><Button disabled>غیرفعال</Button></div>
        </section>

        <section>
          <SectionHeader eyebrow="04 — کارت محصول" title="حالت آماده و ناموجود" />
          {products.length > 0 ? (
            <div className="style-card-grid"><ProductCard product={products[0]} /><ProductCard product={products[1] ?? products[0]} unavailable /></div>
          ) : (
            <div className="empty-state"><span>۰</span><h3>نمونه محصول در دسترس نیست</h3><p>پس از اتصال API، کارت واقعی در این بخش نمایش داده می‌شود.</p></div>
          )}
        </section>

        <section>
          <SectionHeader eyebrow="05 — بازخورد" title="بارگذاری و حالت خالی" />
          <div className="feedback-grid">
            <article className="skeleton-demo" aria-label="نمونه بارگذاری"><div /><span /><span /></article>
            <article className="empty-state"><span>۰</span><h3>محصولی پیدا نشد</h3><p>فیلترها را تغییر دهید و دوباره بررسی کنید.</p><Button variant="secondary">پاک‌کردن فیلترها</Button></article>
          </div>
        </section>
      </Container>
    </main>
  );
}
