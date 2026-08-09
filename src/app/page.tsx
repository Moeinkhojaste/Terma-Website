import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ArrowLeftIcon, FabricIcon, PaisleyIcon, StitchIcon } from "@/components/icons";
import { ProductCarousel } from "@/components/product-carousel";
import { SectionHeader } from "@/components/section-header";
import { products } from "@/data/products";

const sizes = [
  { title: "۴ نفره", product: "نیلا", size: 4 },
  { title: "۶ نفره", product: "لاجورد", size: 6 },
  { title: "۸ نفره", product: "فیروزه", size: 8 },
];

const heroImages = [
  { src: "/images/firoozeh-folded.jpeg", alt: "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی" },
  { src: "/images/lajvard-folded.jpeg", alt: "سفره ترمه لاجورد با نقش‌های سفید و مسی" },
  { src: "/images/nila-folded.jpeg", alt: "سفره ترمه نیلا با نقش‌های بته‌جقه آبی" },
];

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا">
        <section className="hero section-pad">
          <Container className="hero-grid">
            <div className="hero-copy">
              <p className="hero-kicker"><span /> ترمه، برای خانه امروز</p>
              <h1>نقش ایرانی،<br />در خانه شما</h1>
              <p>سفره‌های ترمه با آستر ساتن و لبه‌دوزی دقیق؛ برای پهن‌کردن روی میز یا روی زمین.</p>
              <div className="hero-actions">
                <Button href="#محصولات">دیدن محصولات <ArrowLeftIcon /></Button>
                <Link className="text-link" href="#راهنمای-خرید">راهنمای انتخاب</Link>
              </div>
            </div>
            <figure className="hero-visual">
              {heroImages.map((image, index) => (
                <Image
                  className="hero-slide"
                  src={image.src}
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  loading="eager"
                  sizes="(max-width: 767px) 92vw, 55vw"
                  key={image.src}
                />
              ))}
            </figure>
          </Container>
        </section>

        <section className="section-pad section-rule" id="اندازه‌ها">
          <Container>
            <SectionHeader eyebrow="دسته‌بندی" title="انتخاب بر اساس ظرفیت" />
            <div className="size-grid">
              {sizes.map((size) => (
                <Link className="size-card" href={`/products#size-${size.size}`} key={size.title}>
                  <FabricIcon className="size-12" />
                  <div><h3>{size.title}</h3><span>مشاهده {size.product} <ArrowLeftIcon /></span></div>
                </Link>
              ))}
            </div>
          </Container>
        </section>

        <section className="section-pad products-section" id="محصولات">
          <Container>
            <div className="heading-row">
              <SectionHeader eyebrow="مجموعه ترما" title="منتخب‌های ترما" description="سه محصول از مجموعه فعلی را ببینید و برای مشاهده فهرست کامل وارد صفحه محصولات شوید." />
              <div className="featured-heading-actions">
                <p className="heading-note">۳ محصول منتخب</p>
                <Button href="/products" variant="secondary">مشاهده همه محصولات <ArrowLeftIcon /></Button>
              </div>
            </div>
            <ProductCarousel products={products} />
          </Container>
        </section>

        <section className="values section-pad" id="داستان-ترما">
          <Container>
            <SectionHeader align="center" eyebrow="آنچه در محصول می‌بینید" title="جزئیات روشن، بدون ادعای اضافه" />
            <div className="values-grid">
              <article><span><PaisleyIcon /></span><h3>نقش ایرانی</h3><p>بته‌جقه و نقوش ریز سنتی، با ترکیب رنگ مناسب خانه‌های امروزی.</p></article>
              <article><span><StitchIcon /></span><h3>دوخت منظم</h3><p>لبه‌دوزی یکپارچه و نوار کرم‌طلایی در چهار طرف سفره.</p></article>
              <article><span><FabricIcon /></span><h3>آستر ساتن</h3><p>پشت هر سفره با ساتن هم‌رنگ آستر شده است تا ظاهر آن کامل‌تر باشد.</p></article>
            </div>
          </Container>
        </section>

        <section className="detail-section section-pad" id="جزئیات">
          <Container className="detail-grid">
            <div className="detail-image">
              <Image src="/images/nila-folded.jpeg" alt="نمای نزدیک بافت، لبه‌دوزی و آستر ساتن سفره ترمه نیلا" fill sizes="(max-width: 767px) 92vw, 55vw" />
              <span className="detail-label detail-label--fabric">بافت ترمه</span>
              <span className="detail-label detail-label--lining">آستر ساتن</span>
            </div>
            <div className="detail-copy">
              <p className="section-eyebrow">از نزدیک</p>
              <h2>بافت، لبه و آستر؛<br />سه جزئی که دیده می‌شوند</h2>
              <p>رنگ آبی زمینه در کنار نقش‌های کرم و سرمه‌ای قرار گرفته است. نوار باریک دور کار، مرز تمیزی میان رویه ترمه و آستر ساتن می‌سازد.</p>
              <ul>
                <li><span>۰۱</span><div><strong>رویه ترمه</strong><p>نقوش بته‌جقه با جزئیات ریز و تکرار منظم</p></div></li>
                <li><span>۰۲</span><div><strong>لبه‌دوزی</strong><p>نوار کرم‌طلایی در امتداد چهار طرف سفره</p></div></li>
                <li><span>۰۳</span><div><strong>پشت کار</strong><p>آستر ساتن هماهنگ با رنگ اصلی هر محصول</p></div></li>
              </ul>
            </div>
          </Container>
        </section>

        <section className="guide section-pad" id="راهنمای-خرید">
          <Container className="guide-grid">
            <div>
              <SectionHeader eyebrow="پیش از انتخاب" title="اندازه درست را پیدا کنید" description="ظرفیت اعلام‌شده نقطه شروع است؛ طول و عرض فضایی را که می‌خواهید سفره را روی آن پهن کنید نیز اندازه بگیرید." />
              <p className="guide-caution">ابعاد نوشته‌شده بر اساس اطلاعات فعلی محصولات است. پیش از سفارش نهایی، اندازه دقیق را بررسی کنید.</p>
            </div>
            <div className="guide-steps">
              <article><span>۱</span><div><h3>فضای استفاده را اندازه بگیرید</h3><p>طول و عرض فضایی را که می‌خواهید سفره را روی آن پهن کنید یادداشت کنید.</p></div></article>
              <article><span>۲</span><div><h3>اندازه محصول را مقایسه کنید</h3><p>ابعاد سفره باید با فضای موردنظر و مقدار حاشیه دلخواه شما هماهنگ باشد.</p></div></article>
              <article><span>۳</span><div><h3>ظرفیت را انتخاب کنید</h3><p>مدل‌های فعلی در دسته‌های ۴، ۶ و ۸ نفره قرار گرفته‌اند.</p></div></article>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
