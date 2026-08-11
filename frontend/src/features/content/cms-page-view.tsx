import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ApiError } from "@/lib/api-client";
import { listProducts } from "@/features/products/product-api";
import type { Product } from "@/features/products/models";
import { getPublishedCmsPage } from "./cms-api";
import { CmsDocumentRenderer } from "./cms-renderer";
import { getDraftCmsPage } from "./cms-preview-server";

export async function CmsPageView({ slug, previewId }: { slug: string; previewId?: string }) {
  let page;
  let preview = false;
  try { const draft = previewId ? await getDraftCmsPage(previewId) : undefined; page = draft ? { slug: draft.slug, name: draft.name, document: draft.document, publishedAt: new Date().toISOString() } : await getPublishedCmsPage(slug); preview = Boolean(draft); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  let products: Product[] = [];
  if (page.document.blocks.some((block) => block.type === "productShowcase")) {
    try { products = (await listProducts({ page: 1, pageSize: 6 })).items; } catch { products = []; }
  }
  return <>{preview && <div className="cms-preview-banner">در حال مشاهده پیش‌نویس هستید.<Link href="/api/cms/preview/exit">خروج از پیش‌نمایش</Link></div>}<a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a><Header /><main id="محتوا"><CmsDocumentRenderer document={page.document} products={products} showContactForm={slug === "contact"} /></main><Footer /></>;
}
