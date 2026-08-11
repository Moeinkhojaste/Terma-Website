import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "@/features/products/components/product-carousel";
import type { Product } from "@/features/products/models";
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

  if (block.type === "announcement") return <div className="announcement cms-announcement">{text}</div>;
  if (block.type === "hero") return <section className="cms-hero section-pad"><Container className="cms-hero__grid"><div className="cms-copy">{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h1>{title}</h1>{text && <p>{text}</p>}<div className="cms-actions">{stringValue(data.primaryLabel) && <Button href={safeHref(data.primaryHref)}>{stringValue(data.primaryLabel)}</Button>}{stringValue(data.secondaryLabel) && <Button href={safeHref(data.secondaryHref)} variant="secondary">{stringValue(data.secondaryLabel)}</Button>}</div></div>{imageUrl && <figure className="cms-media"><CmsImage src={imageUrl} alt={imageAlt} /></figure>}</Container></section>;
  if (block.type === "richText") return <section className="cms-rich section-pad"><Container>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}{title && <h2>{title}</h2>}{data.content ? <RichTextOutput node={data.content as RichTextNode} /> : <p>{text}</p>}</Container></section>;
  if (block.type === "imageText") return <section className="cms-image-text section-pad section-rule"><Container className={`cms-image-text__grid ${data.imageSide === "left" ? "cms-image-text__grid--reverse" : ""}`}>{imageUrl && <figure className="cms-media"><CmsImage src={imageUrl} alt={imageAlt} /></figure>}<div className="cms-copy">{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h2>{title}</h2><p>{text}</p></div></Container></section>;
  if (block.type === "featureGrid") return <section className="cms-features section-pad" id={stringValue(data.anchor) || undefined}><Container>{eyebrow && <p className="section-eyebrow">{eyebrow}</p>}<h2>{title}</h2>{text && <p className="cms-lead">{text}</p>}<div className="cms-card-grid">{items.map((item, index) => <article key={`${item.title}-${index}`}><span>{new Intl.NumberFormat("fa-IR", { minimumIntegerDigits: 2 }).format(index + 1)}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}</div></Container></section>;
  if (block.type === "faq") return <section className="cms-faq section-pad"><Container><h2>{title}</h2><div>{items.map((item, index) => <details key={`${item.question}-${index}`}><summary>{item.question}<span aria-hidden="true">+</span></summary><p>{item.answer}</p></details>)}</div></Container></section>;
  if (block.type === "cta") return <section className="cms-cta section-pad"><Container><div><h2>{title}</h2><p>{text}</p></div>{data.label && <Button href={safeHref(data.href)}>{stringValue(data.label)}</Button>}</Container></section>;
  if (block.type === "contactInfo") return <section className="cms-contact section-pad"><Container className="cms-contact__grid"><div><h2>{title || "راه‌های ارتباط"}</h2>{text && <p>{text}</p>}<dl>{stringValue(data.email) && <><dt>ایمیل</dt><dd><a href={`mailto:${stringValue(data.email)}`} dir="ltr">{stringValue(data.email)}</a></dd></>}{stringValue(data.phone) && <><dt>تلفن</dt><dd><a href={`tel:${stringValue(data.phone)}`} dir="ltr">{stringValue(data.phone)}</a></dd></>}{stringValue(data.responseHours) && <><dt>زمان پاسخ‌گویی</dt><dd>{stringValue(data.responseHours)}</dd></>}</dl></div>{showContactForm && <ContactForm contactEmail={stringValue(data.email) || undefined} />}</Container></section>;
  if (block.type === "linkList" || block.type === "categoryLinks") return <section className="cms-links section-pad"><Container>{title && <h2>{title}</h2>}<div className="cms-link-grid">{items.map((item, index) => <Link href={safeHref(item.href)} key={`${item.label}-${index}`}>{item.label}<span aria-hidden="true">←</span></Link>)}</div></Container></section>;
  if (block.type === "productShowcase") return <section className="section-pad products-section"><Container><div className="heading-row"><div><p className="section-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div><Button href="/products" variant="secondary">مشاهده همه محصولات</Button></div>{products.length ? <ProductCarousel products={products.slice(0, numberValue(data.count, 3))} /> : <div className="catalog-empty catalog-empty--compact"><h3>هنوز محصول فعالی ثبت نشده است</h3></div>}</Container></section>;
  return null;
}

export function CmsDocumentRenderer({ document, products, showContactForm }: { document: CmsDocument; products?: Product[]; showContactForm?: boolean }) {
  return <>{document.blocks.map((block) => <CmsBlockRenderer block={block} products={products} showContactForm={showContactForm} key={block.id} />)}</>;
}
