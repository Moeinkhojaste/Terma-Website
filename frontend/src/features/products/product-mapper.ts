import { formatPrice } from "@/lib/format";
import type { Product, ProductDto, ProductPage, PagedResponse } from "@/features/products/models";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

const PRODUCT_MEDIA: Record<string, { image: string; tableImage: string; imageAlt: string; tableImageAlt: string }> = {
  "TER-NIL-BLU-4P-001": {
    image: "/images/nila-folded.jpeg",
    tableImage: "/images/nila-table.png",
    imageAlt: "سفره ترمه نیلا با زمینه آبی و نقش بته‌جقه روی زمینه سفید",
    tableImageAlt: "سفره ترمه نیلا روی میز چهار نفره",
  },
  "TER-LAJ-NVY-6P-001": {
    image: "/images/lajvard-folded.jpeg",
    tableImage: "/images/lajvard-table.png",
    imageAlt: "سفره ترمه لاجورد با زمینه سرمه‌ای و نقش‌های سفید و مسی روی زمینه سفید",
    tableImageAlt: "سفره ترمه لاجورد روی میز شش نفره",
  },
  "TER-FIR-BLU-8P-001": {
    image: "/images/firoozeh-folded.jpeg",
    tableImage: "/images/firoozeh-table.png",
    imageAlt: "سفره ترمه فیروزه با زمینه آبی و نقش‌های کرم و مسی روی زمینه سفید",
    tableImageAlt: "سفره ترمه فیروزه روی میز هشت نفره",
  },
};

function formatDecimal(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

export function mapProduct(dto: ProductDto): Product {
  const description = dto.description?.trim() || "اطلاعات تکمیلی این محصول به‌زودی ثبت می‌شود.";
  const media = PRODUCT_MEDIA[dto.sku] ?? {
    image: PRODUCT_PLACEHOLDER,
    tableImage: PRODUCT_PLACEHOLDER,
    imageAlt: `تصویر ${dto.name} هنوز بارگذاری نشده است`,
    tableImageAlt: `تصویر دوم ${dto.name} هنوز بارگذاری نشده است`,
  };
  const hasDiscount = Boolean(dto.compareAtPrice && dto.compareAtPrice > dto.price);
  const compareAtPrice = hasDiscount && dto.compareAtPrice ? formatPrice(dto.compareAtPrice) : null;
  const discountPercent = dto.discountPercent ?? (hasDiscount && dto.compareAtPrice ? Math.round(((dto.compareAtPrice - dto.price) / dto.compareAtPrice) * 100) : null);

  return {
    id: dto.id,
    name: dto.name,
    size: dto.tableCapacity,
    capacity: `${new Intl.NumberFormat("fa-IR").format(dto.tableCapacity)} نفره`,
    dimensions: `${formatDecimal(dto.length)} × ${formatDecimal(dto.width)} سانتی‌متر`,
    price: formatPrice(dto.price),
    priceValue: dto.price,
    compareAtPrice,
    compareAtPriceValue: dto.compareAtPrice ?? null,
    discountPercent,
    hasDiscount,
    stockQuantity: dto.stockQuantity,
    stock: dto.stockQuantity > 0 ? "موجود" : "ناموجود",
    sku: dto.sku,
    fabricType: dto.fabricType,
    lining: dto.liningType,
    colors: dto.color,
    pattern: dto.pattern,
    ...media,
    description,
    longDescription: description,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    isActive: dto.isActive,
  };
}

export function mapProductPage(response: PagedResponse<ProductDto>): ProductPage {
  return { ...response, items: response.items.map(mapProduct) };
}
