import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, FabricIcon, PaisleyIcon, StitchIcon } from "@/components/ui/icons";
import { getPublicContent, type PublicContent } from "@/features/content/content-api";

const principles = [
  { number: "۰۱", icon: PaisleyIcon, title: "ریشه در نقش ایرانی", description: "انتخاب محصولاتی با نقش‌های آشنا و رنگ‌هایی که در خانه امروز هم جای خود را پیدا می‌کنند." },
  { number: "۰۲", icon: StitchIcon, title: "توجه به جزئیات", description: "نمایش تصویرهای واقعی موجود و مشخص‌کردن نماهایی که هنوز عکاسی نشده‌اند." },
  { number: "۰۳", icon: FabricIcon, title: "اطلاعات بدون ابهام", description: "اندازه، ظرفیت، جنس و نکات نگهداری هر محصول باید ساده و قابل‌مقایسه نوشته شود." },
];

export async function AboutPage() {
  let content: PublicContent[] = [];
  try { content = await getPublicContent("about"); } catch { content = []; }
  const introContent = content.find((item) => item.sectionKey === "intro");
  const storyContent = content.find((item) => item.sectionKey === "story");
  const valuesContent = content.find((item) => item.sectionKey === "values");

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا">
        <section className="brand-page-hero section-pad">
          <Container className="brand-page-hero__grid">
            <div className="brand-page-hero__copy">
              <p className="hero-kicker"><span /> درباره ترما</p>
              <h1>{introContent?.title ?? "نقش‌های آشنا، برای زندگی امروز"}</h1>
              <p>{introContent?.body ?? "ترما یک فروشگاه آنلاین برای دیدن و انتخاب سفره‌های ترمه است؛ با تمرکز بر معرفی ساده محصول، تصویرهای روشن و جزئیاتی که پیش از خرید به آن‌ها نیاز دارید."}</p>
              <Button href="/products">دیدن مجموعه ترما <ArrowLeftIcon /></Button>
            </div>
            <div className="brand-page-hero__visual">
              <figure className="brand-page-hero__image brand-page-hero__image--main">
                <Image src="/images/lajvard-table.webp" alt="سفره ترمه لاجورد روی میز در فضای خانه" fill priority sizes="(max-width: 767px) 92vw, 45vw" />
              </figure>
              <figure className="brand-page-hero__image brand-page-hero__image--detail">
                <Image src="/images/nila-folded.webp" alt="سفره ترمه نیلا به‌صورت تاشده" fill sizes="(max-width: 767px) 45vw, 18vw" />
              </figure>
              <span className="brand-page-hero__note">انتخاب آگاهانه، با دیدن جزئیات واقعی</span>
            </div>
          </Container>
        </section>

        <section className="about-story section-pad section-rule">
          <Container className="about-story__grid">
            <div>
              <p className="section-eyebrow">داستان ما</p>
              <h2>{storyContent?.title ?? "میان اصالت و سادگی"}</h2>
            </div>
            <div className="about-story__text">
              <p>{storyContent?.body ?? "ترمه پارچه‌ای پرجزئیات است. برای همین در ترما تلاش می‌کنیم تجربه خرید آن شلوغ و پیچیده نباشد. محصول باید از چند زاویه دیده شود و اطلاعات مهم آن در دسترس باشد."}</p>
            </div>
          </Container>
        </section>

        <section className="about-principles section-pad">
          <Container>
            <div className="about-section-heading">
              <p className="section-eyebrow">آنچه برای ما مهم است</p>
              <h2>{valuesContent?.title ?? "سه اصل در معرفی هر محصول"}</h2>
              {valuesContent?.body && <p style={{ color: "var(--muted)", marginTop: "0.5rem" }}>{valuesContent.body}</p>}
            </div>
            <div className="about-principles__grid">
              {principles.map(({ number, icon: Icon, title, description }) => (
                <article key={title}>
                  <span className="about-principles__number">{number}</span>
                  <span className="about-principles__icon"><Icon /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        <section className="about-journey section-pad section-rule">
          <Container className="about-journey__grid">
            <div className="about-journey__image">
              <Image src="/images/firoozeh-folded.webp" alt="سفره ترمه فیروزه به‌صورت تاشده" fill sizes="(max-width: 767px) 92vw, 45vw" />
            </div>
            <div className="about-journey__copy">
              <p className="section-eyebrow">از دیدن تا انتخاب</p>
              <h2>مسیر ساده خرید در ترما</h2>
              <ol>
                <li><span>۱</span><div><strong>تصاویر واقعی محصول را ببینید</strong><p>نمای تاشده و نمای روی میز را بررسی کنید.</p></div></li>
                <li><span>۲</span><div><strong>اندازه مناسب را پیدا کنید</strong><p>فضای موردنظر را اندازه بگیرید و با مشخصات محصول مقایسه کنید.</p></div></li>
                <li><span>۳</span><div><strong>با اطمینان انتخاب کنید</strong><p>اگر پرسشی دارید، پیش از خرید از صفحه ارتباط با ما پیام بفرستید.</p></div></li>
              </ol>
              <div className="about-journey__actions">
                <Button href="/products">مشاهده محصولات <ArrowLeftIcon /></Button>
                <Button href="/contact" variant="secondary">ارتباط با ما</Button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
