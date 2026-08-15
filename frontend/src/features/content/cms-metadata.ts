import type { Metadata } from "next";
import { getPublishedCmsPage } from "./cms-api";

export async function cmsMetadata(slug: string): Promise<Metadata> {
  try {
    const page = await getPublishedCmsPage(slug);
    const seo = page.document.seo;
    return { title: seo.title || page.name, description: seo.description || undefined, alternates: seo.canonicalPath ? { canonical: seo.canonicalPath } : undefined, robots: seo.noIndex ? { index: false, follow: false } : undefined, openGraph: seo.ogImageUrl ? { images: [seo.ogImageUrl] } : undefined };
  } catch { return {}; }
}
