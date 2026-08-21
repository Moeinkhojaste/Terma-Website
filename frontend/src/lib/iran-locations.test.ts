import { describe, expect, it } from "vitest";
import { IRAN_PROVINCES, IRAN_PROVINCES_DATA, getIranCities } from "./iran-locations";

describe("iran-locations", () => {
  it("contains all 31 Iranian provinces", () => {
    expect(IRAN_PROVINCES).toHaveLength(31);
    expect(IRAN_PROVINCES_DATA).toHaveLength(31);
    expect(IRAN_PROVINCES).toContain("تهران");
    expect(IRAN_PROVINCES).toContain("اصفهان");
    expect(IRAN_PROVINCES).toContain("فارس");
    expect(IRAN_PROVINCES).toContain("خراسان رضوی");
    expect(IRAN_PROVINCES).toContain("مازندران");
    expect(IRAN_PROVINCES).toContain("گیلان");
    expect(IRAN_PROVINCES).toContain("آذربایجان شرقی");
    expect(IRAN_PROVINCES).toContain("خوزستان");
    expect(IRAN_PROVINCES).toContain("یزد");
  });

  it("returns cities for each valid province", () => {
    const tehranCities = getIranCities("تهران");
    expect(tehranCities).toContain("تهران");
    expect(tehranCities).toContain("شهریار");
    expect(tehranCities).toContain("اسلامشهر");

    const farsCities = getIranCities("فارس");
    expect(farsCities).toContain("شیراز");
    expect(farsCities).toContain("مرودشت");

    const isfahanCities = getIranCities("اصفهان");
    expect(isfahanCities).toContain("اصفهان");
    expect(isfahanCities).toContain("کاشان");
  });

  it("returns empty array for non-existent province", () => {
    expect(getIranCities("ناموجود")).toEqual([]);
    expect(getIranCities("")).toEqual([]);
  });
});
