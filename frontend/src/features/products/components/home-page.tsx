import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, FabricIcon, PaisleyIcon, StitchIcon } from "@/components/ui/icons";
import { SectionHeader } from "@/components/ui/section-header";
import { ProductCarousel } from "@/features/products/components/product-carousel";
import { HeroSlideshow } from "@/features/products/components/hero-slideshow";
import { listProducts } from "@/features/products/product-api";
import type { Product } from "@/features/products/models";
import { getPublicContent, type PublicContent } from "@/features/content/content-api";
import { getPublishedCmsPage } from "@/features/content/cms-api";
import { getDraftCmsPage } from "@/features/content/cms-preview-server";
import { resolveCmsMediaUrl } from "@/features/content/cms-renderer";
import type { CmsDocument, CmsPublishedPage } from "@/features/content/cms-types";

const sizes = [
  { title: "۴ نفره", size: 4, image: "/images/table-4p.webp", alt: "سفره طرح ترمه روی میز چهار نفره", desc: "ابعاد ۱۰۰×۱۰۰ سانتی‌متر؛ مناسب صبحانه و وعده‌های دونفره تا چهارنفره" },
  { title: "۶ نفره", size: 6, image: "/images/table-6p.webp", alt: "سفره طرح ترمه روی میز شش نفره", desc: "ابعاد ۱۶۰×۱۱۰ سانتی‌متر؛ ابعاد استاندارد برای پذیرایی‌های خانوادگی" },
  { title: "۸ نفره", size: 8, image: "/images/table-8p.webp", alt: "سفره طرح ترمه روی میز هشت نفره", desc: "ابعاد ۲۴۰×۱۱۰ سانتی‌متر؛ مناسب مهمانی‌های بزرگ و سفره‌های اصیل" },
];

const defaultValuesItems = [
  {
    title: "نقش ایرانی",
    text: "بته‌جقه و نقوش ریز سنتی، با ترکیب رنگ مناسب خانه‌های امروزی.",
  },
  {
    title: "دوخت منظم",
    text: "لبه‌دوزی یکپارچه و نوار کرم‌طلایی در چهار طرف سفره.",
  },
  {
    title: "آستر ساتن",
    text: "پشت هر سفره با ساتن هم‌رنگ آستر شده است تا ظاهر آن کامل‌تر باشد.",
  },
];

const defaultGuideItems = [
  {
    title: "فضای استفاده را اندازه بگیرید",
    text: "طول و عرض فضایی را که می‌خواهید سفره را روی آن پهن کنید یادداشت کنید.",
  },
  {
    title: "اندازه محصول را مقایسه کنید",
    text: "ابعاد سفره باید با فضای موردنظر و مقدار حاشیه دلخواه شما هماهنگ باشد.",
  },
  {
    title: "ظرفیت را انتخاب کنید",
    text: "مدل‌های فعلی در دسته‌های ۴، ۶ و ۸ نفره قرار گرفته‌اند.",
  },
];

const valueIcons = [PaisleyIcon, StitchIcon, FabricIcon];

export default async function Home({
  previewId,
}: {
  previewId?: string;
} = {}) {
  let featuredProducts: Product[] = [];
  let catalogUnavailable = false;
  let page:
    | CmsPublishedPage
    | { slug: string; name: string; document: CmsDocument; publishedAt: string }
    | undefined;
  let preview = false;
  let legacyContent: PublicContent[] = [];

  try {
    featuredProducts = (await listProducts({ sort: "newest", page: 1, pageSize: 6 })).items;
  } catch {
    catalogUnavailable = true;
  }

  try {
    const draft = previewId ? await getDraftCmsPage(previewId) : undefined;
    page = draft
      ? {
          slug: draft.slug,
          name: draft.name,
          document: draft.document,
          publishedAt: new Date().toISOString(),
        }
      : await getPublishedCmsPage("home");
    preview = Boolean(draft);
  } catch {
    try {
      legacyContent = await getPublicContent("home");
    } catch {
      legacyContent = [];
    }
  }

  const blocks = page?.document.blocks ?? [];
  const heroBlock = blocks.find((b) => b.type === "hero");
  const featureBlocks = blocks.filter((b) => b.type === "featureGrid");
  const valuesBlock = featureBlocks[0];
  const guideBlock = featureBlocks.find((b) => b.data.anchor === "راهنمای-خرید") ?? featureBlocks[1];
  const craftBlock = blocks.find((b) => b.type === "imageText");
  const categoryBlock = blocks.find((b) => b.type === "categoryLinks");
  const showcaseBlock = blocks.find((b) => b.type === "productShowcase");

  const legacyHero = legacyContent.find((item) => item.sectionKey === "hero");
  const legacyValues = legacyContent.find((item) => item.sectionKey === "values");
  const legacyCraft = legacyContent.find((item) => item.sectionKey === "craft");
  const legacyGuide = legacyContent.find((item) => item.sectionKey === "guide");

  const heroEyebrow =
    (typeof heroBlock?.data.eyebrow === "string" ? heroBlock.data.eyebrow : "") ||
    "ترمه، برای خانه امروز";
  const heroTitle =
    (typeof heroBlock?.data.title === "string" ? heroBlock.data.title : "") ||
    legacyHero?.title ||
    "نقش ایرانی، در خانه شما";
  const heroBody =
    (typeof heroBlock?.data.text === "string" ? heroBlock.data.text : "") ||
    legacyHero?.body ||
    "سفره‌های ترمه با آستر ساتن و لبه‌دوزی دقیق؛ برای پهن‌کردن روی میز یا روی زمین.";
  const heroPrimaryLabel =
    (typeof heroBlock?.data.primaryLabel === "string" ? heroBlock.data.primaryLabel : "") ||
    "دیدن محصولات";
  const heroPrimaryHref =
    (typeof heroBlock?.data.primaryHref === "string" ? heroBlock.data.primaryHref : "") ||
    "#محصولات";
  const heroSecondaryLabel =
    (typeof heroBlock?.data.secondaryLabel === "string" ? heroBlock.data.secondaryLabel : "") ||
    "راهنمای انتخاب";
  const heroSecondaryHref =
    (typeof heroBlock?.data.secondaryHref === "string" ? heroBlock.data.secondaryHref : "") ||
    "#راهنمای-خرید";

  const rawHeroSlides = Array.isArray(heroBlock?.data.images)
    ? (heroBlock.data.images as Array<Record<string, unknown>>)
    : [];

  const heroSlides =
    rawHeroSlides.length > 0
      ? rawHeroSlides
          .map((item) => ({
            src: typeof item.url === "string" ? resolveCmsMediaUrl(item.url) || item.url : "",
            alt: typeof item.alt === "string" ? item.alt : "",
          }))
          .filter((item) => Boolean(item.src))
      : typeof heroBlock?.data.imageUrl === "string" && heroBlock.data.imageUrl
        ? [
            {
              src: resolveCmsMediaUrl(heroBlock.data.imageUrl) || heroBlock.data.imageUrl,
              alt: typeof heroBlock.data.imageAlt === "string" ? heroBlock.data.imageAlt : "",
            },
          ]
        : undefined;

  const categoryEyebrow =
    (typeof categoryBlock?.data.eyebrow === "string" ? categoryBlock.data.eyebrow : "") ||
    "دسته‌بندی";
  const categoryTitle =
    (typeof categoryBlock?.data.title === "string" ? categoryBlock.data.title : "") ||
    "انتخاب بر اساس ظرفیت";
  const categoryDescription =
    (typeof categoryBlock?.data.text === "string" ? categoryBlock.data.text : "") ||
    "سفره ترمه مناسب ابعاد میز خوری خود را انتخاب کنید.";

  const showcaseEyebrow =
    (typeof showcaseBlock?.data.eyebrow === "string" ? showcaseBlock.data.eyebrow : "") ||
    "مجموعه ترما";
  const showcaseTitle =
    (typeof showcaseBlock?.data.title === "string" ? showcaseBlock.data.title : "") ||
    "جدیدترین محصولات ترما";
  const showcaseDescription =
    (typeof showcaseBlock?.data.text === "string" ? showcaseBlock.data.text : "") ||
    "جدیدترین سفره‌های ترمه و آثار تازه ارائه‌شده در مجموعه را ببینید و برای مشاهده همه گزینه‌ها وارد صفحه محصولات شوید.";

  const valuesEyebrow =
    (typeof valuesBlock?.data.eyebrow === "string" ? valuesBlock.data.eyebrow : "") ||
    "آنچه در محصول می‌بینید";
  const valuesTitle =
    (typeof valuesBlock?.data.title === "string" ? valuesBlock.data.title : "") ||
    legacyValues?.title ||
    "جزئیات روشن، بدون ادعای اضافه";
  const valuesDescription =
    (typeof valuesBlock?.data.text === "string" ? valuesBlock.data.text : "") ||
    legacyValues?.body ||
    "";

  const rawValuesItems = Array.isArray(valuesBlock?.data.items)
    ? (valuesBlock.data.items as Array<Record<string, unknown>>)
    : [];
  const valuesItems =
    rawValuesItems.length > 0
      ? rawValuesItems.map((item) => ({
          title: typeof item.title === "string" ? item.title : "",
          text: typeof item.text === "string" ? item.text : "",
        }))
      : defaultValuesItems;

  const craftEyebrow =
    (typeof craftBlock?.data.eyebrow === "string" ? craftBlock.data.eyebrow : "") ||
    "از نزدیک";
  const craftTitle =
    (typeof craftBlock?.data.title === "string" ? craftBlock.data.title : "") ||
    legacyCraft?.title ||
    "نمای تاشده و نقش‌های قابل‌مشاهده";
  const craftBody =
    (typeof craftBlock?.data.text === "string" ? craftBlock.data.text : "") ||
    legacyCraft?.body ||
    "این عکس واقعی، محصول را در حالت تاشده نشان می‌دهد. برای دیدن نمای روی میز، گالری همان محصول را باز کنید.";
  const craftImageUrl =
    (typeof craftBlock?.data.imageUrl === "string" && resolveCmsMediaUrl(craftBlock.data.imageUrl)) ||
    "/images/nila-folded.webp";
  const craftImageAlt =
    (typeof craftBlock?.data.imageAlt === "string" ? craftBlock.data.imageAlt : "") ||
    "سفره ترمه نیلا به‌صورت تاشده روی زمینه سفید";

  const guideEyebrow =
    (typeof guideBlock?.data.eyebrow === "string" ? guideBlock.data.eyebrow : "") ||
    "پیش از انتخاب";
  const guideTitle =
    (typeof guideBlock?.data.title === "string" ? guideBlock.data.title : "") ||
    legacyGuide?.title ||
    "اندازه درست را پیدا کنید";
  const guideBody =
    (typeof guideBlock?.data.text === "string" ? guideBlock.data.text : "") ||
    legacyGuide?.body ||
    "ظرفیت اعلام‌شده نقطه شروع است؛ طول و عرض فضایی را که می‌خواهید سفره را روی آن پهن کنید نیز اندازه بگیرید.";

  const rawGuideItems = Array.isArray(guideBlock?.data.items)
    ? (guideBlock.data.items as Array<Record<string, unknown>>)
    : [];
  const guideItems =
    rawGuideItems.length > 0
      ? rawGuideItems.map((item) => ({
          title: typeof item.title === "string" ? item.title : "",
          text: typeof item.text === "string" ? item.text : "",
        }))
      : defaultGuideItems;

  return (
    <>
      {preview && (
        <div className="cms-preview-banner">
          در حال مشاهده پیش‌نویس هستید.
          <form action="/api/cms/preview/exit" method="POST" style={{ display: "inline", marginInlineStart: "0.75rem" }}>
            <button type="submit" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", font: "inherit" }}>
              خروج از پیش‌نمایش
            </button>
          </form>
        </div>
      )}
      <main id="محتوا">
        <section className="hero section-pad">
          <Container className="hero-grid">
            <div className="hero-copy">
              <p className="hero-kicker"><span /> {heroEyebrow}</p>
              <h1>{heroTitle}</h1>
              <p>{heroBody}</p>
              <div className="hero-actions">
                <Button href={heroPrimaryHref}>{heroPrimaryLabel} <ArrowLeftIcon /></Button>
                <Link className="text-link" href={heroSecondaryHref}>{heroSecondaryLabel}</Link>
              </div>
            </div>
            <HeroSlideshow slides={heroSlides} />
          </Container>
        </section>

        <section className="section-pad section-rule" id="اندازه‌ها">
          <Container>
            <SectionHeader eyebrow={categoryEyebrow} title={categoryTitle} description={categoryDescription} />
            <div className="size-grid">
              {sizes.map((size) => (
                <Link className="size-card" href={`/products?tableCapacity=${size.size}`} key={size.title}>
                  <div className="size-card__image-wrap">
                    <Image
                      src={size.image}
                      alt={size.alt}
                      width={260}
                      height={180}
                      className="size-card__image"
                    />
                    <div className="size-card__badge">{size.title}</div>
                  </div>
                  <div className="size-card__content">
                    <div>
                      <h3>سفره {size.title}</h3>
                      <p>{size.desc}</p>
                    </div>
                    <span className="size-card__cta">
                      مشاهده محصولات <ArrowLeftIcon />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section className="section-pad products-section" id="محصولات">
          <Container>
            <div className="heading-row">
              <SectionHeader eyebrow={showcaseEyebrow} title={showcaseTitle} description={showcaseDescription} />
              <div className="featured-heading-actions">
                <p className="heading-note">{new Intl.NumberFormat("fa-IR").format(featuredProducts.length)} محصول جدید</p>
                <Button href="/products" variant="secondary">مشاهده همه محصولات <ArrowLeftIcon /></Button>
              </div>
            </div>
            {catalogUnavailable ? (
              <div className="catalog-inline-warning" role="status"><span>محصولات جدید اکنون در دسترس نیستند.</span><Link href="/products">تلاش در صفحه محصولات</Link></div>
            ) : featuredProducts.length > 0 ? (
              <ProductCarousel products={featuredProducts} />
            ) : (
              <div className="catalog-empty catalog-empty--compact"><span>۰</span><h3>هنوز محصول فعالی ثبت نشده است</h3><p>محصولات جدید پس از ثبت در این بخش نمایش داده می‌شوند.</p></div>
            )}
          </Container>
        </section>

        <section className="values section-pad" id="داستان-ترما">
          <Container>
            <SectionHeader align="center" eyebrow={valuesEyebrow} title={valuesTitle} description={valuesDescription || undefined} />
            <div className="values-grid">
              {valuesItems.map((item, index) => {
                const IconComponent = valueIcons[index % valueIcons.length];
                return (
                  <article className="values-card" key={`${item.title}-${index}`}>
                    <div className="values-card__icon">
                      <IconComponent />
                    </div>
                    <h3 className="values-card__title">{item.title}</h3>
                    <p className="values-card__text">{item.text}</p>
                  </article>
                );
              })}
            </div>
          </Container>
        </section>

        <section className="detail-section section-pad" id="جزئیات">
          <Container className="detail-grid">
            <div className="detail-image">
              <Image src={craftImageUrl} alt={craftImageAlt} fill sizes="(max-width: 767px) 92vw, 55vw" />
              <span className="detail-label detail-label--fabric">نقش رویه</span>
              <span className="detail-label detail-label--lining">لبه محصول</span>
            </div>
            <div className="detail-copy">
              <p className="section-eyebrow">{craftEyebrow}</p>
              <h2>{craftTitle}</h2>
              <p>{craftBody}</p>
              <ul>
                <li><span>۰۱</span><div><strong>رویه ترمه</strong><p>نقوش بته‌جقه با جزئیات ریز و تکرار منظم</p></div></li>
                <li><span>۰۲</span><div><strong>لبه‌دوزی</strong><p>نوار کرم‌طلایی در امتداد چهار طرف سفره</p></div></li>
                <li><span>۰۳</span><div><strong>نمای دیگر</strong><p>عکس واقعی محصول روی میز در گالری محصول</p></div></li>
              </ul>
            </div>
          </Container>
        </section>

        <section className="guide section-pad" id={typeof guideBlock?.data.anchor === "string" && guideBlock.data.anchor ? guideBlock.data.anchor : "راهنمای-خرید"}>
          <Container className="guide-grid">
            <div>
              <SectionHeader eyebrow={guideEyebrow} title={guideTitle} description={guideBody} />
              <p className="guide-caution">ابعاد نوشته‌شده بر اساس اطلاعات فعلی محصولات است. پیش از سفارش نهایی، اندازه دقیق را بررسی کنید.</p>
            </div>
            <div className="guide-steps">
              {guideItems.map((item, index) => (
                <article key={`${item.title}-${index}`}>
                  <span>{new Intl.NumberFormat("fa-IR").format(index + 1)}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
      </main>
    </>
  );
}
