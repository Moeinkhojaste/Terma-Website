import type { MetadataRoute } from "next";
import { getApiBaseUrl } from "@/lib/api-client";
import { getSiteUrl } from "@/lib/site-url";
import { listCategories } from "@/features/products/product-api";

type BackendSitemapItem = {
  loc: string;
  lastModifiedUtc: string;
  changeFreq: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority: number;
  images?: string[];
};

type BackendSitemapResponse = {
  items: BackendSitemapItem[];
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const sitemapItems: MetadataRoute.Sitemap = [];
  const seenUrls = new Set<string>();

  const pushItem = (item: MetadataRoute.Sitemap[number]) => {
    if (!seenUrls.has(item.url)) {
      seenUrls.add(item.url);
      sitemapItems.push(item);
    }
  };

  // 1. Core static pages
  pushItem({
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1.0,
  });
  pushItem({
    url: `${siteUrl}/products`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.9,
  });
  pushItem({
    url: `${siteUrl}/about`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  });
  pushItem({
    url: `${siteUrl}/contact`,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.6,
  });

  // 2. Categories
  try {
    const categories = await listCategories();
    for (const category of categories) {
      const identifier = category.slug || category.id;
      if (identifier) {
        pushItem({
          url: `${siteUrl}/categories/${encodeURIComponent(identifier)}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Categories fallback if backend API is temporarily unreachable
  }

  // 3. Products
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/store/seo/sitemap`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data: BackendSitemapResponse = await res.json();
      for (const item of data.items) {
        const fullUrl = item.loc.startsWith("http") ? item.loc : `${siteUrl}${item.loc}`;
        pushItem({
          url: fullUrl,
          lastModified: new Date(item.lastModifiedUtc),
          changeFrequency: item.changeFreq,
          priority: item.priority,
          images: item.images,
        });
      }
    }
  } catch {
    // Products fallback if backend API is temporarily unreachable
  }

  return sitemapItems;
}
