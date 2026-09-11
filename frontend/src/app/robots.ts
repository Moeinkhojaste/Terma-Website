import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://termabrand.ir";
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
