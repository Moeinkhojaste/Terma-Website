import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { listProducts } from "@/features/products/product-api";
import type { Product } from "@/features/products/models";
import { getPublishedCmsPage, getPublishedSite } from "./cms-api";
import { CmsDocumentRenderer, type SiteContactInfo } from "./cms-renderer";
import { getDraftCmsPage } from "./cms-preview-server";
import { AboutPage } from "@/features/brand/about-page";

export async function CmsPageView({ slug, previewId }: { slug: string; previewId?: string }) {
  let page;
  let preview = false;
  try {
    const draft = previewId ? await getDraftCmsPage(previewId) : undefined;
    page = draft
      ? { slug: draft.slug, name: draft.name, document: draft.document, publishedAt: new Date().toISOString() }
      : await getPublishedCmsPage(slug);
    preview = Boolean(draft);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  let products: Product[] = [];
  if (page.document.blocks.some((block) => block.type === "productShowcase")) {
    try { products = (await listProducts({ page: 1, pageSize: 6 })).items; } catch { products = []; }
  }

  // Get site-wide contact info if needed
  let siteContactInfo: SiteContactInfo | undefined;
  try {
    const site = await getPublishedSite();
    const siteContactBlock = site.document.blocks.find((b) => b.type === "contactInfo");
    if (siteContactBlock?.data) {
      const d = siteContactBlock.data as Record<string, string>;
      siteContactInfo = {
        brandName: d.brandName,
        tagline: d.tagline,
        logoUrl: d.logoUrl,
        email: d.email,
        phone: d.phone,
        instagramUrl: d.instagramUrl,
        telegramUrl: d.telegramUrl,
        whatsappUrl: d.whatsappUrl,
        responseHours: d.responseHours,
      };
    }
  } catch {
    siteContactInfo = undefined;
  }

  const previewBanner = preview && (
    <div className="cms-preview-banner">
      در حال مشاهده پیش‌نویس هستید.
      <form action="/api/cms/preview/exit" method="POST" style={{ display: "inline", marginInlineStart: "0.75rem" }}>
        <button type="submit" style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", font: "inherit" }}>
          خروج از پیش‌نمایش
        </button>
      </form>
    </div>
  );

  if (slug === "about") {
    return (
      <>
        {previewBanner}
        <AboutPage document={page.document} />
      </>
    );
  }

  return (
    <>
      {previewBanner}
      <main id="محتوا">
        <CmsDocumentRenderer
          document={page.document}
          products={products}
          showContactForm={slug === "contact"}
          siteContactInfo={siteContactInfo}
        />
      </main>
    </>
  );
}
