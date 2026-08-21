import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ClockIcon, MailIcon, MessageIcon, PhoneIcon } from "@/components/ui/icons";
import { ContactForm } from "@/features/brand/contact-form";
import { getPublicContent, type PublicContent } from "@/features/content/content-api";

type ContactPageProps = {
  email?: string;
  phone?: string;
  instagramUrl?: string;
};

const defaultFaqs = [
  { question: "چطور اندازه مناسب را انتخاب کنم؟", answer: "طول و عرض میز یا فضای موردنظر را اندازه بگیرید و با ابعاد نوشته‌شده در صفحه هر محصول مقایسه کنید. ظرفیت چهار، شش یا هشت نفره فقط یک راهنمای اولیه است." },
  { question: "برای پیگیری سفارش چه اطلاعاتی لازم است؟", answer: "در پیام خود نام خریدار، شماره تماس و شماره سفارش را بنویسید تا بررسی درخواست ساده‌تر باشد." },
  { question: "رنگ محصول دقیقاً شبیه عکس است؟", answer: "نور محیط و نمایشگر می‌تواند رنگ را کمی متفاوت نشان دهد. تصاویر مختلف هر محصول را ببینید و اگر رنگ برای شما مهم است، پیش از خرید پیام بفرستید." },
  { question: "آیا امکان همکاری با ترما وجود دارد؟", answer: "بله، موضوع «همکاری با ترما» را در فرم انتخاب کنید و نوع همکاری پیشنهادی خود را توضیح دهید." },
];

export async function ContactPage({ email, phone, instagramUrl }: ContactPageProps) {
  let content: PublicContent[] = [];
  try {
    content = await getPublicContent("contact");
  } catch {
    content = [];
  }

  const introContent = content.find((item) => item.sectionKey === "intro");
  const detailsContent = content.find((item) => item.sectionKey === "details");

  // Dynamic FAQs from CMS
  const cmsFaqs = content
    .filter((item) => item.sectionKey.startsWith("faq"))
    .map((item) => ({ question: item.title, answer: item.body }));

  const finalFaqs = cmsFaqs.length > 0 ? cmsFaqs : defaultFaqs;

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا">
        <section className="contact-hero section-pad">
          <Container className="contact-hero__grid">
            <div>
              <p className="hero-kicker"><span /> ارتباط با ترما</p>
              <h1>{introContent?.title ?? "پرسش شما، شروع گفت‌وگوست"}</h1>
            </div>
            <div className="contact-hero__copy">
              <p>{introContent?.body ?? "برای راهنمایی انتخاب محصول، پیگیری سفارش، پیشنهاد همکاری یا هر پرسش دیگر، از راه‌های زیر با ما در ارتباط باشید."}</p>
              <span>{detailsContent?.body ?? "پیش از ارسال پیام، پرسش‌های رایج پایین صفحه را هم ببینید؛ شاید پاسخ شما همان‌جا باشد."}</span>
            </div>
          </Container>
        </section>

        <section className="contact-content section-pad section-rule">
          <Container className="contact-content__grid">
            <div className="contact-channels">
              <article><span><MailIcon className="size-5" /></span><div><h2>ایمیل</h2>{email ? <a href={`mailto:${email}`} dir="ltr">{email}</a> : <p>info@terma.ir</p>}</div></article>
              <article><span><PhoneIcon className="size-5" /></span><div><h2>تلفن پشتیبانی</h2>{phone ? <a href={`tel:${phone}`} dir="ltr">{phone}</a> : <p>۰۲۱-۸۸۸۸۸۸۸۸</p>}</div></article>
              <article><span><MessageIcon className="size-5" /></span><div><h2>اینستاگرام</h2>{instagramUrl ? <a href={instagramUrl} target="_blank" rel="noreferrer">رفتن به صفحه ترما</a> : <p>صفحه رسمی ترما</p>}</div></article>
              <article><span><ClockIcon className="size-5" /></span><div><h2>زمان پاسخ‌گویی</h2><p>شنبه تا چهارشنبه، ۹ تا ۱۸</p></div></article>
              <aside className="contact-channels__note">
                <strong>پیام شما درباره سفارش است؟</strong>
                <p>نام خریدار، شماره تماس و شماره سفارش را بنویسید. از ارسال اطلاعات کارت بانکی خودداری فرمایید.</p>
              </aside>
            </div>
            <ContactForm contactEmail={email} />
          </Container>
        </section>

        <section className="contact-faq section-pad">
          <Container>
            <div className="about-section-heading">
              <p className="section-eyebrow">پاسخ‌های کوتاه</p>
              <h2>پرسش‌های رایج</h2>
            </div>
            <div className="contact-faq__grid">
              {finalFaqs.map((faq) => (
                <details key={faq.question}>
                  <summary>
                    {faq.question}
                    <span aria-hidden="true">+</span>
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
            <p className="contact-faq__footer">پاسخ خود را پیدا نکردید؟ <Link href="#فرم-پیام">از فرم پیام برای ما بنویسید.</Link></p>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
