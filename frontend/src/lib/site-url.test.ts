import { afterEach, describe, expect, it } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SITE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalEnv;
    }
  });

  it("defaults to https://termabrand.ir when NEXT_PUBLIC_SITE_URL is not set", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("https://termabrand.ir");
  });

  it("uses NEXT_PUBLIC_SITE_URL and removes trailing slashes", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://custom.termabrand.ir///";
    expect(getSiteUrl()).toBe("https://custom.termabrand.ir");
  });
});
