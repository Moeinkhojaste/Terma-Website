import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

describe("SEO - robots()", () => {
  it("generates correct robots rules with canonical sitemap URL", () => {
    const config = robots();
    expect(config.sitemap).toBe("https://termabrand.ir/sitemap.xml");
    expect(config.rules).toBeDefined();
    if (Array.isArray(config.rules)) {
      expect(config.rules[0].userAgent).toBe("*");
    } else {
      expect(config.rules.userAgent).toBe("*");
    }
  });
});

describe("SEO - sitemap()", () => {
  it("always includes core storefront routes with canonical domain", async () => {
    const items = await sitemap();
    const urls = items.map((item) => item.url);

    expect(urls).toContain("https://termabrand.ir");
    expect(urls).toContain("https://termabrand.ir/products");
    expect(urls).toContain("https://termabrand.ir/about");
    expect(urls).toContain("https://termabrand.ir/contact");

    // Ensure none of the URLs use the incorrect terma.ir domain
    for (const url of urls) {
      expect(url).not.toContain("https://terma.ir");
      expect(url.startsWith("https://termabrand.ir")).toBe(true);
    }
  });
});
