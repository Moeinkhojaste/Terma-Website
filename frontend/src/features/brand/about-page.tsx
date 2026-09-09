import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftIcon,
  CheckIcon,
  FabricIcon,
  PaisleyIcon,
  StitchIcon,
} from "@/components/ui/icons";
import type { CmsDocument } from "@/features/content/cms-types";
import { resolveCmsMediaUrl } from "@/features/content/cms-renderer";

type AboutPageProps = {
  document?: CmsDocument;
};

const defaultPrinciples = [
  {
    number: "۰۱",
    icon: PaisleyIcon,
    title: "ریشه در نقش ایرانی",
    description:
      "بته‌جقه و نقوش ریز سنتی یزد و اصفهان با هارمونی رنگ‌های اصیل، سازگار با چیدمان خانه‌های امروزی.",
  },
  {
    number: "۰۲",
    icon: FabricIcon,
    title: "آستر ساتن ابریشمی",
    description:
      "پشت هر سفره با ساتن متراکم و ضخیم همرنگ آستر شده تا ایستایی کامل داشته باشد و روی میز سر نخورد.",
  },
  {
    number: "۰۳",
    icon: StitchIcon,
    title: "دوخت منظم و مغزی‌دوزی",
    description:
      "لبه‌دوزی چهارطرفه با نوار قیطان کرم‌طلایی و دوخت دولایه و یکدست برای افزایش دوام و زیبایی محصول.",
  },
  {
    number: "۰۴",
    icon: CheckIcon,
    title: "شفافیت و تصویر واقعی",
    description:
      "عکاسی بدون روتوش‌های اغراق‌آمیز، درج ابعاد دقیق سانتی‌متری و ارائه مشخصات بدون ابهام برای خریدی مطمئن.",
  },
];

const journeySteps = [
  {
    step: "۱",
    title: "اندازه مناسب را انتخاب کنید",
    text: "فضای میز خود را اندازه بگیرید و از میان گزینه‌های ۴، ۶ و ۸ نفره، اندازه مناسب را مشخص فرمایید.",
  },
  {
    step: "۲",
    title: "جزئیات واقعی را بررسی کنید",
    text: "تصاویر باکیفیت محصول در حالت تاشده، پهن‌شده روی میز و نمای نزدیک لبه‌دوزی را مشاهده کنید.",
  },
  {
    step: "۳",
    title: "با اطمینان خاطر خرید کنید",
    text: "بسته‌بندی ایمن، ارسال سریع با پست پیشتاز به سراسر کشور و ضمانت ۷ روزه بازگشت کالا.",
  },
];

export function AboutPage({ document }: AboutPageProps) {
  const blocks = document?.blocks ?? [];
  const heroBlock = blocks.find((b) => b.type === "hero");
  const storyBlock = blocks.find((b) => b.type === "richText");
  const valuesBlock = blocks.find((b) => b.type === "featureGrid");
  const ctaBlock = blocks.find((b) => b.type === "cta");

  const heroData = (heroBlock?.data ?? {}) as Record<string, unknown>;
  const storyData = (storyBlock?.data ?? {}) as Record<string, unknown>;
  const valuesData = (valuesBlock?.data ?? {}) as Record<string, unknown>;
  const ctaData = (ctaBlock?.data ?? {}) as Record<string, unknown>;

  const heroEyebrow =
    (typeof heroData.eyebrow === "string" && heroData.eyebrow) ||
    "درباره ترما | اصالت هنر ایرانی";
  const heroTitle =
    (typeof heroData.title === "string" && heroData.title) ||
    "نقش‌های آشنا، برای زندگی امروز";
  const heroText =
    (typeof heroData.text === "string" && heroData.text) ||
    "ترما پلی است میان هنر کهن ترمه‌بافی ایران و زیبایی‌شناسی دکوراسیون معاصر. ما باور داریم زیبایی اصیل، هیچ‌گاه کهنه نمی‌شود و جایگاه شایسته آن در قلب زندگی روزمره است.";
  const heroPrimaryLabel =
    (typeof heroData.primaryLabel === "string" && heroData.primaryLabel) ||
    "مشاهده مجموعه محصولات";
  const heroPrimaryHref =
    (typeof heroData.primaryHref === "string" && heroData.primaryHref) ||
    "/products";
  const heroImageUrl =
    (typeof heroData.imageUrl === "string" && resolveCmsMediaUrl(heroData.imageUrl)) ||
    "/images/lajvard-table.webp";
  const heroImageAlt =
    (typeof heroData.imageAlt === "string" && heroData.imageAlt) ||
    "سفره ترمه لاجورد ترما روی میز";

  const storyTitle =
    (typeof storyData.title === "string" && storyData.title) ||
    "میان اصالت و سادگی";
  const storyEyebrow =
    (typeof storyData.eyebrow === "string" && storyData.eyebrow) || "داستان ما";
  const storyText =
    (typeof storyData.text === "string" && storyData.text) ||
    "ترمه پارچه‌ای سرشار از ظرافت و جزئیات تاریخی است، اما انتخاب و خرید سنتی آن گاهی پیچیده و پرابهام بوده است. ترما شکل گرفت تا این فاصله را بردارد؛ با معرفی شفاف و صادقانه، ابعاد استاندارد و عکاسی واقعی از بافت، تاروپود و دوخت.";

  const valuesEyebrow =
    (typeof valuesData.eyebrow === "string" && valuesData.eyebrow) ||
    "آنچه برای ما مهم است";
  const valuesTitle =
    (typeof valuesData.title === "string" && valuesData.title) ||
    "چهار اصل بنیادین ترما در کیفیت";
  const rawValuesItems = Array.isArray(valuesData.items)
    ? (valuesData.items as Array<Record<string, string>>)
    : [];

  const icons = [PaisleyIcon, FabricIcon, StitchIcon, CheckIcon];
  const finalPrinciples =
    rawValuesItems.length > 0
      ? rawValuesItems.map((item, index) => ({
          number: new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 }).format(index + 1),
          icon: icons[index % icons.length],
          title: item.title || "",
          description: item.text || "",
        }))
      : defaultPrinciples;

  const ctaTitle =
    (typeof ctaData.title === "string" && ctaData.title) ||
    "زیبایی اصیل ایرانی، زینت‌بخش خانه شما";
  const ctaText =
    (typeof ctaData.text === "string" && ctaData.text) ||
    "مجموعه نفیس سفره‌های ترمه ترما با آستر ساتن و دوخت لبه‌دوزی منظم را مشاهده کنید و با اطمینان اندازه دلخواه خود را سفارش دهید.";
  const ctaLabel =
    (typeof ctaData.label === "string" && ctaData.label) || "مشاهده و خرید محصولات";
  const ctaHref =
    (typeof ctaData.href === "string" && ctaData.href) || "/products";

  return (
    <main id="محتوا" className="about-luxury-page">
      {/* 1. Hero Section */}
      <section className="about-hero section-pad">
        <Container className="about-hero__grid">
          <div className="about-hero__copy">
            <div className="about-hero__badge">
              <span className="about-hero__badge-dot" />
              <span>{heroEyebrow}</span>
            </div>
            <h1 className="about-hero__title">{heroTitle}</h1>
            <p className="about-hero__lead">{heroText}</p>
            <div className="about-hero__actions">
              <Button href={heroPrimaryHref}>
                {heroPrimaryLabel} <ArrowLeftIcon />
              </Button>
              <Button href="/contact" variant="secondary">
                ارتباط با ترما
              </Button>
            </div>
            <div className="about-hero__features-strip">
              <div className="about-hero__feature-chip">
                <CheckIcon className="size-4" />
                <span>آستر ساتن ابریشمی</span>
              </div>
              <div className="about-hero__feature-chip">
                <CheckIcon className="size-4" />
                <span>لبه‌دوزی چهارطرفه</span>
              </div>
              <div className="about-hero__feature-chip">
                <CheckIcon className="size-4" />
                <span>ضمانت ۷ روزه بازگشت</span>
              </div>
            </div>
          </div>

          <div className="about-hero__visual">
            <div className="about-hero__frame about-hero__frame--main">
              <Image
                src={heroImageUrl}
                alt={heroImageAlt}
                fill
                priority
                sizes="(max-width: 900px) 92vw, 48vw"
                quality={90}
              />
            </div>
            <div className="about-hero__frame about-hero__frame--accent">
              <Image
                src="/images/nila-folded.webp"
                alt="نمای بافت و آستر سفره ترمه نیلا"
                fill
                sizes="(max-width: 900px) 45vw, 22vw"
                quality={90}
              />
            </div>
            <div className="about-hero__floating-card">
              <span className="about-hero__floating-icon">
                <PaisleyIcon className="size-5" />
              </span>
              <div>
                <strong>نقش اصیل ایرانی</strong>
                <small>دوخت تمیز و آستر ساتن اعلا</small>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. Story / Philosophy Section */}
      <section className="about-story-section section-pad section-rule">
        <Container className="about-story-grid">
          <div className="about-story-header">
            <span className="section-eyebrow">{storyEyebrow}</span>
            <h2>{storyTitle}</h2>
            <p className="about-story-lead">{storyText}</p>
          </div>
          <div className="about-story-quote-card">
            <div className="about-story-quote-ornament">«</div>
            <blockquote>
              سفره ترمه در فرهنگ ما، فراتر از یک رومیزی ساده است؛ پیوندی میان خاطره، هنر اصیل ایرانی و میزبانی باوقار در جمع گرم خانواده.
            </blockquote>
            <cite>— مجموعه ترما</cite>
          </div>
        </Container>
      </section>

      {/* 3. Principles & Craftsmanship Pillars */}
      <section className="about-principles-section section-pad">
        <Container>
          <div className="about-section-header text-center">
            <span className="section-eyebrow">{valuesEyebrow}</span>
            <h2>{valuesTitle}</h2>
            <p className="about-section-desc">
              چهار ویژگی که هر قطعه از محصولات ترما را از ترمه‌های معمولی متمایز می‌کند.
            </p>
          </div>
          <div className="about-principles-cards">
            {finalPrinciples.map((item) => {
              const Icon = item.icon;
              return (
                <article className="about-principle-card" key={item.title}>
                  <div className="about-principle-card__top">
                    <span className="about-principle-card__number">{item.number}</span>
                    <span className="about-principle-card__icon">
                      <Icon className="size-6" />
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 4. Craft Details Showcase */}
      <section className="about-craft-showcase section-pad section-rule">
        <Container className="about-craft-grid">
          <div className="about-craft-visual">
            <div className="about-craft-image-wrap">
              <Image
                src="/images/firoozeh-folded.webp"
                alt="نمای لبه‌دوزی و مغزی‌دوزی طلایی سفره ترمه فیروزه"
                fill
                sizes="(max-width: 900px) 92vw, 45vw"
                quality={90}
              />
            </div>
            <div className="about-craft-badge">
              <strong>دوخت دوبل سفارشی</strong>
              <span>کیفیت دست‌دوز، برای سال‌ها ماندگاری</span>
            </div>
          </div>
          <div className="about-craft-content">
            <span className="section-eyebrow">دقت در جزئیات</span>
            <h2>هنر بافت و دوخت ترمه ترما</h2>
            <p>
              در ترما از مرغوب‌ترین الیاف با رنگ‌های پایدار و درخشان استفاده می‌شود. هر قطعه پارچه پس از بافت دقیق نقوش، توسط دوزندگان ماهر آسترکشی شده و با قیطان طلایی دوردوزی می‌شود تا هنگام استفاده، جلوه‌ای بی‌نقص و اتوکشیده به میز خانه شما ببخشد.
            </p>
            <ul className="about-craft-checklist">
              <li>
                <CheckIcon className="size-5" />
                <div>
                  <strong>تار و پود با تراکم بالا:</strong> مقاومت عالی در برابر سایش و تغییر فرم
                </div>
              </li>
              <li>
                <CheckIcon className="size-5" />
                <div>
                  <strong>آستر ساتن بدون سُرخوردگی:</strong> تثبیت مطلوب روی سطوح چوبی، شیشه‌ای و سنگی
                </div>
              </li>
              <li>
                <CheckIcon className="size-5" />
                <div>
                  <strong>ثبات رنگ در شست‌وشو:</strong> حفظ درخشش نقش‌ها پس از استفاده مداوم
                </div>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* 5. Buying Journey */}
      <section className="about-journey-section section-pad">
        <Container>
          <div className="about-section-header text-center">
            <span className="section-eyebrow">تجربه خریدی آرام</span>
            <h2>مسیر ساده و مطمئن در ترما</h2>
            <p className="about-section-desc">
              انتخاب ترمه مناسب در سه قدم کوتاه و روشن.
            </p>
          </div>
          <div className="about-journey-steps">
            {journeySteps.map((step) => (
              <div className="about-journey-step" key={step.step}>
                <div className="about-journey-step__num">{step.step}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. High-End CTA */}
      <section className="about-cta-section section-pad">
        <Container>
          <div className="about-cta-card">
            <div className="about-cta-card__content">
              <span className="about-cta-card__eyebrow">مجموعه فاخر ترما</span>
              <h2>{ctaTitle}</h2>
              <p>{ctaText}</p>
              <div className="about-cta-card__actions">
                <Button href={ctaHref}>
                  {ctaLabel} <ArrowLeftIcon />
                </Button>
                <Link href="/contact" className="about-cta-card__link">
                  پرسشی دارید؟ با ما گفتگو کنید ←
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
