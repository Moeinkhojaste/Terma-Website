import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { ProductCatalog } from "@/features/products/components/product-catalog";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";
import { getPublishedCmsPage } from "@/features/content/cms-api";
import { getDraftCmsPage } from "@/features/content/cms-preview-server";
import type { CmsDocument, CmsPublishedPage } from "@/features/content/cms-types";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

const defaultFaqs = [
  {
    question: "ابعاد سفره‌های ۴، ۶ و ۸ نفره ترما چقدر است؟",
    answer: "سفره ۴ نفره در اندازه ۱۰۰×۱۰۰ سانتی‌متر (مربع)، سفره ۶ نفره در اندازه ۱۶۰×۱۱۰ سانتی‌متر (مستطیل) و سفره ۸ نفره در اندازه ۲۴۰×۱۱۰ سانتی‌متر (مستطیل بزرگ) با آستر ساتن هم‌رنگ و لبه‌دوزی منظم دوخته می‌شوند.",
  },
  {
    question: "جنس پارچه و آستر سفره‌های طرح ترمه چگونه است؟",
    answer: "رویه این سفره‌ها از پارچه متراکم با نقوش اصیل طرح ترمه تهیه شده و پشت هر سفره با پارچه ساتن ضخیم آسترکشی شده است تا ایستایی منظمی روی میز داشته باشد و از لغزش جلوگیری کند.",
  },
  {
    question: "بهترین روش شست‌وشو و اتوکشی این سفره‌ها چیست؟",
    answer: "توصیه می‌شود سفره را با آب ولرم یا سرد و مایع لباسشویی ملایم به‌صورت دستی یا دور ملایم ماشین لباسشویی بشویید. برای حفظ زیبایی طرح، اتوکشی را با درجه ملایم از سمت آستر ساتن انجام دهید.",
  },
  {
    question: "چگونه سفره مناسب ابعاد میز خود را انتخاب کنم؟",
    answer: "طول و عرض سطح میز خود را اندازه بگیرید. برای جلوه زیباتر، پیشنهاد می‌شود سفره بین ۱۵ تا ۲۵ سانتی‌متر از لبه‌های میز آویزان شود. مدل‌های ۴، ۶ و ۸ نفره متناسب با اندازه‌های استاندارد میزهای ناهارخوری تولید شده‌اند.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const defaultMeta: Metadata = {
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

  try {
    const page = await getPublishedCmsPage("products");
    const seo = page?.document?.seo;
    if (!seo) return defaultMeta;

    return {
      title: seo.title || defaultMeta.title,
      description: seo.description || defaultMeta.description,
      alternates: {
        canonical: seo.canonicalPath || `${siteUrl}/products`,
      },
      robots: seo.noIndex ? { index: false, follow: false } : undefined,
      openGraph: {
        title: seo.title || (defaultMeta.openGraph as { title?: string })?.title,
        description: seo.description || (defaultMeta.openGraph as { description?: string })?.description,
        url: `${siteUrl}/products`,
        images: seo.ogImageUrl ? [{ url: seo.ogImageUrl }] : undefined,
      },
    };
  } catch {
    return defaultMeta;
  }
}

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

export default async function ProductsPage({
  previewId,
}: {
  previewId?: string;
} = {}) {
  let page:
    | CmsPublishedPage
    | { slug: string; name: string; document: CmsDocument; publishedAt: string }
    | undefined;

  try {
    const draft = previewId ? await getDraftCmsPage(previewId) : undefined;
    page = draft
      ? {
          slug: draft.slug,
          name: draft.name,
          document: draft.document,
          publishedAt: new Date().toISOString(),
        }
      : await getPublishedCmsPage("products");
  } catch {
    page = undefined;
  }

  const blocks = page?.document?.blocks ?? [];
  const heroBlock = blocks.find((b) => b.type === "hero");
  const heroEyebrow =
    typeof heroBlock?.data?.eyebrow === "string" && heroBlock.data.eyebrow.trim()
      ? heroBlock.data.eyebrow
      : "مجموعه اصیل ترما";
  const heroTitle =
    typeof heroBlock?.data?.title === "string" && heroBlock.data.title.trim()
      ? heroBlock.data.title
      : "سفره‌های اصیل طرح ترمه";
  const heroDesc =
    typeof heroBlock?.data?.text === "string" && heroBlock.data.text.trim()
      ? heroBlock.data.text
      : "مجموعه سفره‌های غذاخوری و پذیرایی با نقوش سنتی، دوخت یکپارچه و آستر ساتن هم‌رنگ در اندازه‌های استاندارد ۴ نفره (۱۰۰×۱۰۰ سانتی‌متر)، ۶ نفره (۱۶۰×۱۱۰ سانتی‌متر) و ۸ نفره (۲۴۰×۱۱۰ سانتی‌متر).";

  const faqBlock = blocks.find((b) => b.type === "faq");
  const faqData = faqBlock?.data;

  const faqEyebrow =
    typeof faqData?.eyebrow === "string" && faqData.eyebrow.trim()
      ? faqData.eyebrow
      : "پاسخ به سوالات شما";
  const faqTitle =
    typeof faqData?.title === "string" && faqData.title.trim()
      ? faqData.title
      : "پرسش‌های متداول خرید سفره طرح ترمه";

  const rawItems = Array.isArray(faqData?.items) ? faqData.items : [];
  const parsedFaqs = rawItems
    .map((item) => ({
      question: String(item.question ?? "").trim(),
      answer: String(item.answer ?? "").trim(),
    }))
    .filter((item) => Boolean(item.question && item.answer));

  const finalFaqs = faqBlock ? parsedFaqs : defaultFaqs;

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: finalFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      {finalFaqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
        />
      )}
      <main id="محتوا">
        <section className="catalog-hero">
          <Container>
            <nav className="breadcrumbs" aria-label="مسیر صفحه">
              <Link href="/">خانه</Link><span>/</span><span aria-current="page">محصولات</span>
            </nav>
            <div className="catalog-hero__header">
              <div>
                <p className="section-eyebrow">{heroEyebrow}</p>
                <h1>{heroTitle}</h1>
              </div>
              <p className="catalog-hero__desc">{heroDesc}</p>
            </div>
          </Container>
        </section>

        <Suspense fallback={<ProductCatalogLoading />}>
          <ProductCatalog />
        </Suspense>

        {finalFaqs.length > 0 && (
          <section className="contact-faq section-pad" id="سوالات-متداول">
            <Container>
              <div className="catalog-hero__header mb-6">
                <div>
                  <p className="section-eyebrow">{faqEyebrow}</p>
                  <h2>{faqTitle}</h2>
                </div>
              </div>
              <div className="contact-faq__grid">
                {finalFaqs.map((faq, index) => (
                  <details key={`${faq.question}-${index}`}>
                    <summary>
                      {faq.question} <span aria-hidden="true">+</span>
                    </summary>
                    <p>{faq.answer}</p>
                  </details>
                ))}
              </div>
            </Container>
          </section>
        )}
      </main>
    </>
  );
}
