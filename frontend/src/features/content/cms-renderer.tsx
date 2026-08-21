import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/features/products/components/product-carousel";
import type { Product } from "@/features/products/models";
import { ClockIcon, InstagramIcon, MailIcon, PhoneIcon, TelegramIcon, WhatsAppIcon } from "@/components/ui/icons";
import { ContactForm } from "@/features/brand/contact-form";
import { getApiBaseUrl } from "@/lib/api-client";
import type { CmsBlock, CmsDocument, RichTextNode } from "./cms-types";

function stringValue(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function numberValue(value: unknown, fallback = 0) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function itemsValue(value: unknown) { return Array.isArray(value) ? value.filter((item): item is Record<string, string> => typeof item === "object" && item !== null) : []; }
function safeHref(value: unknown) {
  const href = stringValue(value, "#");
  return href.startsWith("/") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:") ? href : "#";
}
export function resolveCmsMediaUrl(value: unknown) {
  const path = stringValue(value);
  if (!path) return "";
  if (path.startsWith("/api/media/")) {
    try { return `${getApiBaseUrl()}${path}`; } catch { return path; }
  }
  return path;
}
function CmsImage({ src, alt }: { src: string; alt: string }) { return <Image src={src} alt={alt} fill sizes="(max-width: 900px) 92vw, 50vw" unoptimized />; }

export function RichTextOutput({ node }: { node?: RichTextNode }) {
  if (!node) return null;
  const children = node.content?.map((child, index) => <RichTextOutput node={child} key={`${child.type}-${index}`} />);
  if (node.type === "text") {
    let output: React.ReactNode = node.text ?? "";
    for (const mark of node.marks ?? []) {
      if (mark.type === "bold") output = <strong>{output}</strong>;
      if (mark.type === "link") output = <a href={safeHref(mark.attrs?.href)}>{output}</a>;
    }
    return output;
  }
  if (node.type === "heading") {
    const level = numberValue(node.attrs?.level, 2);
    if (level === 3) return <h3>{children}</h3>;
    return <h2>{children}</h2>;
  }
  if (node.type === "bulletList") return <ul>{children}</ul>;
  if (node.type === "orderedList") return <ol>{children}</ol>;
  if (node.type === "listItem") return <li>{children}</li>;
  if (node.type === "paragraph") return <p>{children}</p>;
  if (node.type === "hardBreak") return <br />;
  return <>{children}</>;
}

export function CmsBlockRenderer({ block, products = [], showContactForm = false }: { block: CmsBlock; products?: Product[]; showContactForm?: boolean }) {
  const data = block.data;
  const title = stringValue(data.title);
  const text = stringValue(data.text);
  const eyebrow = stringValue(data.eyebrow);
  const imageUrl = resolveCmsMediaUrl(data.imageUrl);
  const imageAlt = stringValue(data.imageAlt, title);
  const items = itemsValue(data.items);

  const rawImages = Array.isArray(data.images) ? (data.images as Array<Record<string, unknown>>) : [];
  const heroMediaUrl = (rawImages.length > 0 && typeof rawImages[0]?.url === "string" && resolveCmsMediaUrl(rawImages[0].url)) || imageUrl;
  const heroMediaAlt = (rawImages.length > 0 && typeof rawImages[0]?.alt === "string" ? rawImages[0].alt : "") || imageAlt;

  if (block.type === "announcement") return <div className="announcement cms-announcement">{text}</div>;
  if (block.type === "hero") return (
    <section className={`cms-hero ${!heroMediaUrl ? "cms-hero--no-media" : ""} section-pad`}>
      <Container className={`cms-hero__grid ${!heroMediaUrl ? "cms-hero__grid--no-media" : ""}`}>
        <div className="cms-copy">
          {eyebrow && <p className="section-eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {text && <p>{text}</p>}
          {(stringValue(data.primaryLabel) || stringValue(data.secondaryLabel)) && (
            <div className="cms-actions">
              {stringValue(data.primaryLabel) && <Button href={safeHref(data.primaryHref)}>{stringValue(data.primaryLabel)}</Button>}
              {stringValue(data.secondaryLabel) && <Button href={safeHref(data.secondaryHref)} variant="secondary">{stringValue(data.secondaryLabel)}</Button>}
            </div>
          )}
        </div>
        {heroMediaUrl && <figure className="cms-media"><CmsImage src={heroMediaUrl} alt={heroMediaAlt} /></figure>}
      </Container>
    </section>
  );
  if (block.type === "richText") return <section className="cms-rich section-pad"><Container>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}{data.content ? <RichTextOutput node={data.content as RichTextNode} /> : <p>{text}</p>}</Container></section>;
  if (block.type === "imageText") return <section className="cms-image-text section-pad section-rule"><Container className={`cms-image-text__grid ${data.imageSide === "left" ? "cms-image-text__grid--reverse" : ""}`}>{imageUrl && <figure className="cms-media"><CmsImage src={imageUrl} alt={imageAlt} /></figure>}<div className="cms-copy">{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h2>{title}</h2><p>{text}</p></div></Container></section>;
  if (block.type === "featureGrid") return <section className="cms-features section-pad" id={stringValue(data.anchor) || undefined}><Container>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{text && <p className="cms-lead">{text}</p>}<div className="cms-card-grid">{items.map((item, index) => <article key={`${item.title}-${index}`}><span>{new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 }).format(index + 1)}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></Container></section>;
  if (block.type === "faq") return <section className="cms-faq section-pad"><Container><h2>{title}</h2><div>{items.map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></Container></section>;
  if (block.type === "cta") return <section className="cms-cta section-pad"><Container><div><h2>{title}</h2><p>{text}</p></div>{data.label && <Button href={safeHref(data.href)}>{stringValue(data.label)}</Button>}</Container></section>;
  if (block.type === "contactInfo") {
    const email = stringValue(data.email);
    const phone = stringValue(data.phone);
    const responseHours = stringValue(data.responseHours);
    const instagramUrl = stringValue(data.instagramUrl);
    const telegramUrl = stringValue(data.telegramUrl);
    const whatsappUrl = stringValue(data.whatsappUrl);
    return (
      <section className="cms-contact section-pad">
        <Container className="cms-contact__grid">
          <div className="cms-contact__info">
            <div className="cms-contact__header">
              <h2>{title || "راه‌های ارتباط"}</h2>
              {text && <p>{text}</p>}
            </div>
            <div className="cms-contact__cards">
              {email && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><MailIcon className="size-5" /></span>
                  <div>
                    <strong>ایمیل</strong>
                    <a href={`mailto:${email}`} dir="ltr">{email}</a>
                  </div>
                </article>
              )}
              {phone && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><PhoneIcon className="size-5" /></span>
                  <div>
                    <strong>تلفن پشتیبانی</strong>
                    <a href={`tel:${phone}`} dir="ltr">{phone}</a>
                  </div>
                </article>
              )}
              {instagramUrl && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><InstagramIcon className="size-5" /></span>
                  <div>
                    <strong>اینستاگرام</strong>
                    <a href={instagramUrl} target="_blank" rel="noreferrer" dir="ltr">صفحه رسمی ترما</a>
                  </div>
                </article>
              )}
              {telegramUrl && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><TelegramIcon className="size-5" /></span>
                  <div>
                    <strong>تلگرام</strong>
                    <a href={telegramUrl} target="_blank" rel="noreferrer" dir="ltr">کانال و پشتیبانی تلگرام</a>
                  </div>
                </article>
              )}
              {whatsappUrl && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><WhatsAppIcon className="size-5" /></span>
                  <div>
                    <strong>واتساپ</strong>
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" dir="ltr">گفت‌وگو در واتساپ</a>
                  </div>
                </article>
              )}
              {responseHours && (
                <article className="cms-contact-card">
                  <span className="cms-contact-card__icon"><ClockIcon className="size-5" /></span>
                  <div>
                    <strong>ساعت پاسخ‌گویی</strong>
                    <p>{responseHours}</p>
                  </div>
                </article>
              )}
            </div>
            <aside className="cms-contact__note">
              <strong>پیام شما درباره سفارش است؟</strong>
              <p>نام خریدار، شماره تماس و شماره سفارش را بنویسید. از ارسال اطلاعات کارت بانکی خودداری فرمایید.</p>
            </aside>
          </div>
          {showContactForm && <ContactForm contactEmail={email || undefined} />}
        </Container>
      </section>
    );
  }
  if (block.type === "linkList" || block.type === "categoryLinks") return <section className="cms-links section-pad"><Container>{title && <h2>{title}</h2>}<div className="cms-link-grid">{items.map((item, index) => <Link href={safeHref(item.href)} key={`${item.label}-${index}`}>{item.label}<span aria-hidden="true">←</span></Link>)}</div></Container></section>;
  if (block.type === "productShowcase") return <section className="section-pad products-section"><Container><div className="heading-row"><div><p className="section-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div><Button href="/products" variant="secondary">مشاهده همه محصولات</Button></div>{products.length ? <ProductCarousel products={products.slice(0, numberValue(data.count, 3))} /> : <div className="catalog-empty catalog-empty--compact"><h3>هنوز محصول فعالی ثبت نشده است</h3></div>}</Container></section>;
  return null;
}

export function CmsDocumentRenderer({ document, products, showContactForm }: { document: CmsDocument; products?: Product[]; showContactForm?: boolean }) {
  return <>{document.blocks.map((block) => <CmsBlockRenderer block={block} products={products} showContactForm={showContactForm} key={block.id} />)}</>;
}
