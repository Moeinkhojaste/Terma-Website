import type { MetadataRoute } from "next";
import { getApiBaseUrl } from "@/lib/api-client";

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://terma.ir";

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/store/seo/sitemap`, {
      cache: "no-store",
    });

    if (res.ok) {
      const data: BackendSitemapResponse = await res.json();
      return data.items.map((item) => ({
        url: item.loc.startsWith("http") ? item.loc : `${siteUrl}${item.loc}`,
        lastModified: new Date(item.lastModifiedUtc),
        changeFrequency: item.changeFreq,
        priority: item.priority,
        images: item.images,
      }));
    }
  } catch {
    // Fallback static routes if API is temporarily unavailable
  }

  const fallbackRoutes = ["", "/products", "/about", "/contact"];
  return fallbackRoutes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));
}
