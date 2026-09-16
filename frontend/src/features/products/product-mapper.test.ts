import { describe, it, expect } from "vitest";
import { mapProduct, mapProductPage } from "./product-mapper";
import type { ProductDto } from "./models";

describe("product-mapper", () => {
  const baseDto: ProductDto = {
    id: "prod-123",
    slug: "termeh-nila-blue",
    name: "رومیزی ترمه نیلا آبی",
    sku: "TER-NIL-BLU-4P-001",
    description: "توضیحات تست ترمه نیلا",
    price: 1_200_000,
    compareAtPrice: 1_500_000,
    discountPercent: 20,
    stockQuantity: 10,
    availableQuantity: 8,
    tableCapacity: 4,
    length: 100,
    width: 100,
    fabricType: "ترمه ابریشم",
    liningType: "ساتن تافته",
    color: "آبی فیروزه‌ای",
    pattern: "شاه عباسی",
    categoryId: "cat-1",
    categoryName: "رومیزی",
    categorySlug: "tablecloth",
    isActive: true,
    variants: [
      {
        id: "var-4p",
        productId: "prod-123",
        title: "۴ نفره",
        sku: "TER-NIL-BLU-4P-001",
        color: "آبی",
        tableCapacity: 4,
        length: 100,
        width: 100,
        price: 1_200_000,
        compareAtPrice: 1_500_000,
        stockQuantity: 5,
        availableQuantity: 5,
        lowStockThreshold: 2,
        isActive: true,
      },
      {
        id: "var-6p",
        productId: "prod-123",
        title: "۶ نفره",
        sku: "TER-NIL-BLU-6P-001",
        color: "آبی",
        tableCapacity: 6,
        length: 160,
        width: 110,
        price: 1_800_000,
        compareAtPrice: null,
        stockQuantity: 3,
        availableQuantity: 3,
        lowStockThreshold: 1,
        isActive: true,
      },
    ],
    media: [
      {
        id: "med-1",
        productId: "prod-123",
        publicUrl: "/images/nila-folded.webp",
        altText: "تصویر نیلا تا شده",
        kind: "folded",
        sortOrder: 0,
        isPrimary: true,
      },
      {
        id: "med-2",
        productId: "prod-123",
        publicUrl: "/images/nila-table.webp",
        altText: "تصویر نیلا روی میز",
        kind: "table",
        sortOrder: 1,
        isPrimary: false,
      },
    ],
  };

  it("maps ProductDto to UI Product model with calculated properties", () => {
    const product = mapProduct(baseDto);

    expect(product.id).toBe("prod-123");
    expect(product.name).toBe("رومیزی ترمه نیلا آبی");
    expect(product.slug).toBe("termeh-nila-blue");
    expect(product.price).toContain("۱٬۲۰۰٬۰۰۰");
    expect(product.priceValue).toBe(1_200_000);
    expect(product.hasDiscount).toBe(true);
    expect(product.discountPercent).toBe(20);
    expect(product.stockQuantity).toBe(8); // 5 + 3 active variants
    expect(product.stock).toBe("موجود");
    expect(product.media).toHaveLength(2);
    expect(product.image).toBe("/images/nila-folded.webp");
    expect(product.tableImage).toBe("/images/nila-table.webp");
  });

  it("builds capacity options (4, 6, 8 persons) with availability flags", () => {
    const product = mapProduct(baseDto);
    expect(product.capacities).toHaveLength(3);

    const fourPerson = product.capacities.find((c) => c.tableCapacity === 4);
    const sixPerson = product.capacities.find((c) => c.tableCapacity === 6);
    const eightPerson = product.capacities.find((c) => c.tableCapacity === 8);

    expect(fourPerson?.isAvailable).toBe(true);
    expect(fourPerson?.priceValue).toBe(1_200_000);
    expect(fourPerson?.hasDiscount).toBe(true);

    expect(sixPerson?.isAvailable).toBe(true);
    expect(sixPerson?.priceValue).toBe(1_800_000);
    expect(sixPerson?.hasDiscount).toBe(false);

    expect(eightPerson?.isAvailable).toBe(false); // Unregistered capacity
    expect(eightPerson?.stockQuantity).toBe(0);
  });

  it("mapProductPage maps paginated responses", () => {
    const paged = mapProductPage({
      items: [baseDto],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    expect(paged.items).toHaveLength(1);
    expect(paged.items[0].name).toBe("رومیزی ترمه نیلا آبی");
    expect(paged.totalCount).toBe(1);
  });

  it("maps static products without server media to exactly one primary image", () => {
    const staticSkus = ["TER-NIL-BLU-4P-001", "TER-LAJ-NVY-6P-001", "TER-FIR-BLU-8P-001"];
    for (const sku of staticSkus) {
      const product = mapProduct({ ...baseDto, sku, media: [] });
      expect(product.media).toHaveLength(1);
      expect(product.media[0].kind).toBe("folded");
      expect(product.media[0].isPrimary).toBe(true);
      expect(product.image).toBe(product.media[0].src);
      expect(product.tableImage).toBe(product.media[0].src);
    }
  });
});
