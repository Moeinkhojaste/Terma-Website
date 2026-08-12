import { formatPrice } from "@/lib/format";
import type { Product, ProductDto, ProductPage, PagedResponse, ProductCapacityOption } from "@/features/products/models";

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

function buildCapacitiesList(dto: ProductDto): ProductCapacityOption[] {
  const standardCapacities = [4, 6, 8];
  const activeVariants = (dto.variants ?? []).filter((v) => v.isActive);

  return standardCapacities
    .map((cap) => {
      // 1) Search in registered active variants
      const foundVariant = activeVariants.find((v) => v.tableCapacity === cap);
      if (foundVariant) {
        const avail = foundVariant.availableQuantity ?? foundVariant.stockQuantity;
        const hasDiscount = Boolean(foundVariant.compareAtPrice && foundVariant.compareAtPrice > foundVariant.price);
        const compareAtPriceFormatted = hasDiscount && foundVariant.compareAtPrice ? formatPrice(foundVariant.compareAtPrice) : null;
        const discountPercent = hasDiscount && foundVariant.compareAtPrice
          ? Math.round(((foundVariant.compareAtPrice - foundVariant.price) / foundVariant.compareAtPrice) * 100)
          : null;

        return {
          id: foundVariant.id,
          tableCapacity: cap,
          capacityLabel: `${new Intl.NumberFormat("fa-IR").format(cap)} نفره`,
          length: foundVariant.length,
          width: foundVariant.width,
          dimensions: `${formatDecimal(foundVariant.length)} × ${formatDecimal(foundVariant.width)} سانتی‌متر`,
          price: formatPrice(foundVariant.price),
          priceValue: foundVariant.price,
          compareAtPrice: compareAtPriceFormatted,
          compareAtPriceValue: foundVariant.compareAtPrice ?? null,
          discountPercent,
          hasDiscount,
          stockQuantity: Math.max(0, avail),
          isAvailable: avail > 0,
          sku: foundVariant.sku,
        };
      }

      // 2) If matches dto main product (when no variants array or single legacy variant)
      if (dto.tableCapacity === cap) {
        const hasDiscount = Boolean(dto.compareAtPrice && dto.compareAtPrice > dto.price);
        const compareAtPriceFormatted = hasDiscount && dto.compareAtPrice ? formatPrice(dto.compareAtPrice) : null;
        const discountPercent = dto.discountPercent ?? (hasDiscount && dto.compareAtPrice ? Math.round(((dto.compareAtPrice - dto.price) / dto.compareAtPrice) * 100) : null);

        return {
          tableCapacity: cap,
          capacityLabel: `${new Intl.NumberFormat("fa-IR").format(cap)} نفره`,
          length: dto.length,
          width: dto.width,
          dimensions: `${formatDecimal(dto.length)} × ${formatDecimal(dto.width)} سانتی‌متر`,
          price: formatPrice(dto.price),
          priceValue: dto.price,
          compareAtPrice: compareAtPriceFormatted,
          compareAtPriceValue: dto.compareAtPrice ?? null,
          discountPercent,
          hasDiscount,
          stockQuantity: dto.stockQuantity,
          isAvailable: dto.stockQuantity > 0,
          sku: dto.sku,
        };
      }

      // 3) Unregistered capacity for this product -> ALWAYS UNAVAILABLE (ناموجود)
      let defaultLen = 100;
      let defaultWid = 100;
      if (cap === 6) { defaultLen = 160; defaultWid = 110; }
      else if (cap === 8) { defaultLen = 240; defaultWid = 110; }

      return {
        tableCapacity: cap,
        capacityLabel: `${new Intl.NumberFormat("fa-IR").format(cap)} نفره`,
        length: defaultLen,
        width: defaultWid,
        dimensions: `${formatDecimal(defaultLen)} × ${formatDecimal(defaultWid)} سانتی‌متر`,
        price: formatPrice(dto.price),
        priceValue: dto.price,
        stockQuantity: 0,
        isAvailable: false, // Mark as unavailable so user cannot select it!
        sku: dto.sku,
      };
    })
    .sort((a, b) => a.tableCapacity - b.tableCapacity);
}

export function mapProduct(dto: ProductDto): Product {
  const description = dto.description?.trim() || "اطلاعات تکمیلی این محصول به‌زودی ثبت می‌شود.";
  const media = PRODUCT_MEDIA[dto.sku] ?? {
    image: PRODUCT_PLACEHOLDER,
    tableImage: PRODUCT_PLACEHOLDER,
    imageAlt: `تصویر ${dto.name} هنوز بارگذاری نشده است`,
    tableImageAlt: `تصویر دوم ${dto.name} هنوز بارگذاری نشده است`,
  };
  const capacities = buildCapacitiesList(dto);

  const availableCapacities = capacities.filter((c) => c.isAvailable);
  const minCapacity = availableCapacities.length > 0
    ? availableCapacities.reduce((prev, curr) => (curr.priceValue < prev.priceValue ? curr : prev))
    : (capacities.length > 0 ? capacities.reduce((prev, curr) => (curr.priceValue < prev.priceValue ? curr : prev)) : null);

  const finalPriceValue = minCapacity ? minCapacity.priceValue : dto.price;
  const finalPriceFormatted = minCapacity ? minCapacity.price : formatPrice(dto.price);
  const finalCompareAtPrice = minCapacity ? minCapacity.compareAtPrice : (Boolean(dto.compareAtPrice && dto.compareAtPrice > dto.price) ? formatPrice(dto.compareAtPrice!) : null);
  const finalCompareAtPriceValue = minCapacity ? minCapacity.compareAtPriceValue : (dto.compareAtPrice ?? null);
  const finalDiscountPercent = minCapacity ? minCapacity.discountPercent : (dto.discountPercent ?? null);
  const finalHasDiscount = minCapacity ? Boolean(minCapacity.hasDiscount) : Boolean(dto.compareAtPrice && dto.compareAtPrice > dto.price);

  const totalStockQuantity = dto.variants && dto.variants.length > 0
    ? dto.variants.filter((v) => v.isActive).reduce((sum, v) => sum + (v.availableQuantity ?? v.stockQuantity), 0)
    : dto.stockQuantity;

  return {
    id: dto.id,
    name: dto.name,
    size: minCapacity ? minCapacity.tableCapacity : dto.tableCapacity,
    capacity: minCapacity ? minCapacity.capacityLabel : `${new Intl.NumberFormat("fa-IR").format(dto.tableCapacity)} نفره`,
    dimensions: minCapacity ? minCapacity.dimensions : `${formatDecimal(dto.length)} × ${formatDecimal(dto.width)} سانتی‌متر`,
    price: finalPriceFormatted,
    priceValue: finalPriceValue,
    compareAtPrice: finalCompareAtPrice ?? null,
    compareAtPriceValue: finalCompareAtPriceValue ?? null,
    discountPercent: finalDiscountPercent ?? null,
    hasDiscount: finalHasDiscount,
    stockQuantity: totalStockQuantity,
    stock: totalStockQuantity > 0 ? "موجود" : "ناموجود",
    sku: minCapacity ? minCapacity.sku : dto.sku,
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
    capacities,
  };
}

export function mapProductPage(response: PagedResponse<ProductDto>): ProductPage {
  return { ...response, items: response.items.map(mapProduct) };
}
