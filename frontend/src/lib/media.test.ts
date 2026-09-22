import { describe, expect, it } from "vitest";
import { isUnoptimizedMedia, normalizeMediaUrl } from "./media";

describe("media utilities", () => {
  describe("normalizeMediaUrl", () => {
    it("returns empty string for null or empty input", () => {
      expect(normalizeMediaUrl(null)).toBe("");
      expect(normalizeMediaUrl(undefined)).toBe("");
      expect(normalizeMediaUrl("")).toBe("");
      expect(normalizeMediaUrl("   ")).toBe("");
    });

    it("preserves relative /api/media paths untouched", () => {
      expect(normalizeMediaUrl("/api/media/4c02209d6f314fbf972173f40d39e31d.webp")).toBe(
        "/api/media/4c02209d6f314fbf972173f40d39e31d.webp",
      );
    });

    it("strips internal docker hostnames (prod-backend, staging-backend, backend)", () => {
      expect(normalizeMediaUrl("http://prod-backend:8080/api/media/sample.webp")).toBe(
        "/api/media/sample.webp",
      );
      expect(normalizeMediaUrl("http://staging-backend:8080/api/media/sample.webp")).toBe(
        "/api/media/sample.webp",
      );
      expect(normalizeMediaUrl("http://backend:8080/api/media/sample.webp")).toBe(
        "/api/media/sample.webp",
      );
    });

    it("preserves static images in /images/", () => {
      expect(normalizeMediaUrl("/images/nila-folded.webp")).toBe("/images/nila-folded.webp");
    });

    it("preserves public absolute URLs", () => {
      expect(normalizeMediaUrl("https://termabrand.ir/api/media/sample.webp")).toBe(
        "https://termabrand.ir/api/media/sample.webp",
      );
      expect(normalizeMediaUrl("https://cdn.example.com/photo.jpg")).toBe(
        "https://cdn.example.com/photo.jpg",
      );
    });

    it("prepends leading slash if api/ without slash is given", () => {
      expect(normalizeMediaUrl("api/media/sample.webp")).toBe("/api/media/sample.webp");
    });
  });

  describe("isUnoptimizedMedia", () => {
    it("returns true for /api/ paths", () => {
      expect(isUnoptimizedMedia("/api/media/sample.webp")).toBe(true);
    });

    it("returns true for http and https URLs", () => {
      expect(isUnoptimizedMedia("http://example.com/img.png")).toBe(true);
      expect(isUnoptimizedMedia("https://termabrand.ir/api/media/img.webp")).toBe(true);
    });

    it("returns true for data and blob URLs", () => {
      expect(isUnoptimizedMedia("data:image/png;base64,...")).toBe(true);
      expect(isUnoptimizedMedia("blob:http://localhost/...")).toBe(true);
    });

    it("returns false for static local /images/ paths", () => {
      expect(isUnoptimizedMedia("/images/nila-folded.webp")).toBe(false);
      expect(isUnoptimizedMedia("/images/product-placeholder.svg")).toBe(false);
    });

    it("returns false for null, undefined or empty strings", () => {
      expect(isUnoptimizedMedia(null)).toBe(false);
      expect(isUnoptimizedMedia(undefined)).toBe(false);
      expect(isUnoptimizedMedia("")).toBe(false);
    });
  });
});
