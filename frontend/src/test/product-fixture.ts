import type { Product } from "@/features/products/models";

export function createProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "product-1",
    slug: "سفره-ترمه-آبی",
    variantId: "variant-6",
    name: "سفره ترمه آبی",
    size: 6,
    capacity: "۶ نفره",
    dimensions: "۱۲۰ × ۱۸۰ سانتی‌متر",
    price: "۲٬۰۰۰٬۰۰۰ تومان",
    priceValue: 2_000_000,
    hasDiscount: false,
    stockQuantity: 3,
    stock: "موجود",
    sku: "TERMA-BLUE-6",
    fabricType: "پارچه مبلی",
    lining: "آستر پارچه‌ای",
    colors: "آبی",
    pattern: "ترمه",
    image: "/products/blue-folded.webp",
    tableImage: "/products/blue-table.webp",
    imageAlt: "نمای تاشده سفره ترمه آبی",
    tableImageAlt: "سفره ترمه آبی روی میز",
    media: [
      { id: "folded", src: "/products/blue-folded.webp", alt: "نمای تاشده", kind: "folded", sortOrder: 0, isPrimary: true },
      { id: "table", src: "/products/blue-table.webp", alt: "نمای روی میز", kind: "table", sortOrder: 1, isPrimary: false },
    ],
    description: "سفره پارچه‌ای",
    longDescription: "سفره پارچه‌ای مناسب میز شش نفره",
    categoryId: "category-1",
    categoryName: "سفره میز",
    isActive: true,
    capacities: [],
    ...overrides,
  };
}
