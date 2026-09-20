import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const indexingEnabled = process.env.NEXT_PUBLIC_SITE_INDEXING_ENABLED !== "false" && process.env.SITE_INDEXING_ENABLED !== "false";

  if (!indexingEnabled) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/checkout", "/checkout/", "/account", "/account/", "/api", "/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
