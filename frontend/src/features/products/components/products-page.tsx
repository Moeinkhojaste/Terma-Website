import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { ProductCatalog } from "@/features/products/components/product-catalog";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "خرید سفره طرح ترمه سنتی (۴، ۶ و ۸ نفره)",
  description: "مشاهده و خرید انواع سفره‌های غذاخوری و پذیرایی طرح ترمه با دوخت دقیق و آستر ساتن در ظرفیت‌های ۴، ۶ و ۸ نفره در فروشگاه ترما.",
  alternates: {
    canonical: `${siteUrl}/products`,
  },
  openGraph: {
    title: "خرید سفره طرح ترمه سنتی (۴، ۶ و ۸ نفره) | ترما",
    description: "مشاهده و خرید انواع سفره‌های غذاخوری و پذیرایی طرح ترمه با دوخت دقیق و آستر ساتن در ظرفیت‌های ۴، ۶ و ۸ نفره در فروشگاه ترما.",
    url: `${siteUrl}/products`,
  },
};

const breadcrumbStructuredData = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "خانه",
      item: siteUrl,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "محصولات",
      item: `${siteUrl}/products`,
    },
  ],
};

const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "ابعاد سفره‌های ۴، ۶ و ۸ نفره ترما چقدر است؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "سفره ۴ نفره در اندازه ۱۰۰×۱۰۰ سانتی‌متر (مربع)، سفره ۶ نفره در اندازه ۱۶۰×۱۱۰ سانتی‌متر (مستطیل) و سفره ۸ نفره در اندازه ۲۴۰×۱۱۰ سانتی‌متر (مستطیل بزرگ) با آستر ساتن هم‌رنگ و لبه‌دوزی منظم دوخته می‌شوند.",
      },
    },
    {
      "@type": "Question",
      name: "جنس پارچه و آستر سفره‌های طرح ترمه چگونه است؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "رویه این سفره‌ها از پارچه متراکم با نقوش اصیل طرح ترمه تهیه شده و پشت هر سفره با پارچه ساتن ضخیم آسترکشی شده است تا ایستایی منظمی روی میز داشته باشد و از لغزش جلوگیری کند.",
      },
    },
    {
      "@type": "Question",
      name: "بهترین روش شست‌وشو و اتوکشی این سفره‌ها چیست؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "توصیه می‌شود سفره را با آب ولرم یا سرد و مایع لباسشویی ملایم به‌صورت دستی یا دور ملایم ماشین لباسشویی بشویید. برای حفظ زیبایی طرح، اتوکشی را با درجه ملایم از سمت آستر ساتن انجام دهید.",
      },
    },
    {
      "@type": "Question",
      name: "چگونه سفره مناسب ابعاد میز خود را انتخاب کنم؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "طول و عرض سطح میز خود را اندازه بگیرید. برای جلوه زیباتر، پیشنهاد می‌شود سفره بین ۱۵ تا ۲۵ سانتی‌متر از لبه‌های میز آویزان شود. مدل‌های ۴، ۶ و ۸ نفره متناسب با اندازه‌های استاندارد میزهای ناهارخوری تولید شده‌اند.",
      },
    },
  ],
};

export default function ProductsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <main id="محتوا">
        <section className="catalog-hero">
          <Container>
            <nav className="breadcrumbs" aria-label="مسیر صفحه">
              <Link href="/">خانه</Link><span>/</span><span aria-current="page">محصولات</span>
            </nav>
            <div className="catalog-hero__header">
              <div>
                <p className="section-eyebrow">مجموعه اصیل ترما</p>
                <h1>سفره‌های اصیل طرح ترمه</h1>
              </div>
              <p className="catalog-hero__desc">
                مجموعه سفره‌های غذاخوری و پذیرایی با نقوش سنتی، دوخت یکپارچه و آستر ساتن هم‌رنگ در اندازه‌های استاندارد ۴ نفره (۱۰۰×۱۰۰ سانتی‌متر)، ۶ نفره (۱۶۰×۱۱۰ سانتی‌متر) و ۸ نفره (۲۴۰×۱۱۰ سانتی‌متر).
              </p>
            </div>
          </Container>
        </section>

        <Suspense fallback={<ProductCatalogLoading />}>
          <ProductCatalog />
        </Suspense>

        <section className="section-pad section-rule bg-[var(--ivory)]" id="راهنمای-اندازه">
          <Container>
            <div className="catalog-hero__header mb-8">
              <div>
                <p className="section-eyebrow">راهنمای انتخاب اندازه</p>
                <h2>ابعاد و ظرفیت سفره‌های غذاخوری</h2>
              </div>
              <p className="catalog-hero__desc">
                برای انتخاب سفره مناسب، ابعاد میز خود را در نظر بگیرید تا مقدار افتادگی سفره از لبه‌ها متناسب و زیبا باشد.
              </p>
            </div>
            <div className="size-grid">
              <div className="size-card">
                <div className="size-card__content p-6">
                  <div className="size-card__badge mb-3">۴ نفره</div>
                  <h3>سفره ۴ نفره (۱۰۰ × ۱۰۰ سانتی‌متر)</h3>
                  <p className="text-muted text-sm leading-relaxed mt-2">
                    طراحی مربع مناسب برای میزهای ۴ نفره، میز صبحانه‌خوری و وعده‌های دونفره تا چهارنفره خانوادگی.
                  </p>
                </div>
              </div>
              <div className="size-card">
                <div className="size-card__content p-6">
                  <div className="size-card__badge mb-3">۶ نفره</div>
                  <h3>سفره ۶ نفره (۱۶۰ × ۱۱۰ سانتی‌متر)</h3>
                  <p className="text-muted text-sm leading-relaxed mt-2">
                    طراحی مستطیل با ابعاد استاندارد برای میزهای ناهارخوری ۶ نفره، پذیرایی‌های خانوادگی و چیدمان روزمره.
                  </p>
                </div>
              </div>
              <div className="size-card">
                <div className="size-card__content p-6">
                  <div className="size-card__badge mb-3">۸ نفره</div>
                  <h3>سفره ۸ نفره (۲۴۰ × ۱۱۰ سانتی‌متر)</h3>
                  <p className="text-muted text-sm leading-relaxed mt-2">
                    سفره بزرگ مستطیلی برای میزهای ۸ نفره، مجالس، مهمانی‌های اصیل و ضیافت‌های خانوادگی.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        <section className="contact-faq section-pad" id="سوالات-متداول">
          <Container>
            <div className="catalog-hero__header mb-6">
              <div>
                <p className="section-eyebrow">پاسخ به سوالات شما</p>
                <h2>پرسش‌های متداول خرید سفره طرح ترمه</h2>
              </div>
            </div>
            <div className="contact-faq__grid">
              <details>
                <summary>ابعاد سفره‌های ۴، ۶ و ۸ نفره ترما چقدر است؟ <span aria-hidden="true">+</span></summary>
                <p>سفره ۴ نفره در اندازه ۱۰۰×۱۰۰ سانتی‌متر (مربع)، سفره ۶ نفره در اندازه ۱۶۰×۱۱۰ سانتی‌متر (مستطیل) و سفره ۸ نفره در اندازه ۲۴۰×۱۱۰ سانتی‌متر (مستطیل بزرگ) با آستر ساتن هم‌رنگ و لبه‌دوزی منظم دوخته می‌شوند.</p>
              </details>
              <details>
                <summary>جنس پارچه و آستر سفره‌ها چگونه است؟ <span aria-hidden="true">+</span></summary>
                <p>رویه این سفره‌ها از پارچه متراکم با نقوش سنتی طرح ترمه تهیه شده و پشت هر سفره با پارچه ساتن ضخیم آسترکشی شده است تا ایستایی منظمی روی میز داشته باشد و از لغزش جلوگیری کند.</p>
              </details>
              <details>
                <summary>بهترین روش شست‌وشو و اتوکشی این سفره‌ها چیست؟ <span aria-hidden="true">+</span></summary>
                <p>توصیه می‌شود سفره را با آب ولرم یا سرد و شوینده ملایم به‌صورت دستی یا دور ملایم ماشین لباسشویی بشویید. برای حفظ زیبایی طرح، اتوکشی را با درجه ملایم از سمت آستر ساتن انجام دهید.</p>
              </details>
              <details>
                <summary>چگونه سفره مناسب ابعاد میز خود را انتخاب کنم؟ <span aria-hidden="true">+</span></summary>
                <p>طول و عرض سطح میز خود را اندازه بگیرید. برای جلوه زیباتر، پیشنهاد می‌شود سفره بین ۱۵ تا ۲۵ سانتی‌متر از لبه‌های میز آویزان شود. مدل‌های ۴، ۶ و ۸ نفره متناسب با اندازه‌های رایج میزهای ناهارخوری تولید شده‌اند.</p>
              </details>
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}
