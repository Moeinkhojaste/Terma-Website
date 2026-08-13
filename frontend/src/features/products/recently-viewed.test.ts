import { describe, expect, it } from "vitest";
import { readRecentSearches, readRecentlyViewed, recordRecentSearch, recordRecentlyViewed } from "@/features/products/recently-viewed";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe("recent discovery history", () => {
  it("deduplicates viewed products, puts newest first, and keeps eight", () => {
    const local = storage();
    for (let index = 1; index <= 9; index += 1) recordRecentlyViewed(`product-${index}`, local);
    recordRecentlyViewed("product-5", local);

    expect(readRecentlyViewed(local)).toEqual(["product-5", "product-9", "product-8", "product-7", "product-6", "product-4", "product-3", "product-2"]);
  });

  it("returns an empty list for damaged storage", () => {
    expect(readRecentlyViewed(storage({ "terma-recently-viewed": "not-json" }))).toEqual([]);
  });

  it("trims, deduplicates, and limits recent searches", () => {
    const local = storage();
    ["سبز", "سفره ۶ نفره", "ترمه آبی", "زیر دو میلیون", "آبی", "سبز"].forEach((query) => recordRecentSearch(` ${query} `, local));

    expect(readRecentSearches(local)).toEqual(["سبز", "آبی", "زیر دو میلیون", "ترمه آبی", "سفره ۶ نفره"]);
  });
});
