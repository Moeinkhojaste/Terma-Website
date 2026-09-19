import { formatPrice } from "@/lib/format";
import { getApiBaseUrl } from "@/lib/api-client";
import type { Product, ProductDto, ProductPage, PagedResponse, ProductCapacityOption, ProductMedia, ProductMediaKind } from "@/features/products/models";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

const PRODUCT_MEDIA: Record<string, ProductMedia[]> = {
  "TER-NIL-BLU-4P-001": [
    { id: "static-nila-folded", src: "/images/nila-folded.webp", alt: "سفره ترمه نیلا با زمینه آبی و نقش بته‌جقه روی زمینه سفید", kind: "folded", sortOrder: 0, isPrimary: true },
    { id: "static-nila-table", src: "/images/nila-table.webp", alt: "سفره ترمه نیلا روی میز چهار نفره", kind: "table", sortOrder: 1, isPrimary: false },
  ],
  "TER-LAJ-NVY-6P-001": [
    { id: "static-lajvard-folded", src: "/images/lajvard-folded.webp", alt: "سفره ترمه لاجورد با زمینه سرمه‌ای و نقش‌های سفید و مسی روی زمینه سفید", kind: "folded", sortOrder: 0, isPrimary: true },
    { id: "static-lajvard-table", src: "/images/lajvard-table.webp", alt: "سفره ترمه لاجورد روی میز شش نفره", kind: "table", sortOrder: 1, isPrimary: false },
  ],
  "TER-FIR-BLU-8P-001": [
    { id: "static-firoozeh-folded", src: "/images/firoozeh-folded.webp", alt: "سفره ترمه فیروزه با زمینه آبی و نقش‌های کرم و مسی روی زمینه سفید", kind: "folded", sortOrder: 0, isPrimary: true },
    { id: "static-firoozeh-table", src: "/images/firoozeh-table.webp", alt: "سفره ترمه فیروزه روی میز هشت نفره", kind: "table", sortOrder: 1, isPrimary: false },
  ],
};

const MEDIA_KINDS = new Set<ProductMediaKind>(["full", "table", "folded", "texture", "stitching", "lining", "other"]);

function mediaUrl(value: string) {
  if (/^https?:\/\//i.test(value) || value.startsWith("/images/")) return value;
  if (value.startsWith("/api/")) return `${getApiBaseUrl()}${value}`;
  return value;
}

function buildMedia(dto: ProductDto): ProductMedia[] {
  if (dto.media && dto.media.length > 0) {
    return dto.media
      .map((item) => {
        const normalizedKind = item.kind.toLowerCase() as ProductMediaKind;
        return {
          id: item.id,
          src: mediaUrl(item.publicUrl),
          alt: item.altText,
          kind: MEDIA_KINDS.has(normalizedKind) ? normalizedKind : "other" as const,
          sortOrder: item.sortOrder,
          isPrimary: item.isPrimary,
        };
      })
      .sort((first, second) => Number(second.isPrimary) - Number(first.isPrimary) || first.sortOrder - second.sortOrder);
  }
  return PRODUCT_MEDIA[dto.sku] ?? [{
    id: `placeholder-${dto.id}`,
    src: PRODUCT_PLACEHOLDER,
    alt: `تصویر ${dto.name} هنوز بارگذاری نشده است`,
    kind: "other",
    sortOrder: 0,
    isPrimary: true,
  }];
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

function buildCapacitiesList(dto: ProductDto): ProductCapacityOption[] {
  const standardCapacities = [4, 6, 8];
  const activeVariants = (dto.variants ?? []).filter((v) => v.isActive !== false);

  return standardCapacities
    .map((cap) => {
      // 1) Search in registered active variants
      const foundVariant = activeVariants.find((v) => v.tableCapacity === cap);
      if (foundVariant) {
        const avail = foundVariant.availableQuantity ?? foundVariant.stockQuantity ?? 0;
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
        const mainStock = dto.availableQuantity ?? dto.stockQuantity ?? 0;
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
          stockQuantity: Math.max(0, mainStock),
          isAvailable: mainStock > 0,
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
  const media = buildMedia(dto);
  const primaryMedia = media.find((item) => item.isPrimary) ?? media[0];
  const tableMedia = media.find((item) => item.kind === "table") ?? media[1] ?? primaryMedia;
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
    ? dto.variants.filter((v) => v.isActive !== false).reduce((sum, v) => sum + (v.availableQuantity ?? v.stockQuantity ?? 0), 0)
    : (dto.availableQuantity ?? dto.stockQuantity ?? 0);

  return {
    id: dto.id,
    slug: dto.slug || dto.id,
    variantId: minCapacity?.id,
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
    image: primaryMedia.src,
    tableImage: tableMedia.src,
    imageAlt: primaryMedia.alt,
    tableImageAlt: tableMedia.alt,
    media,
    description,
    longDescription: description,
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    categorySlug: dto.categorySlug,
    isActive: dto.isActive ?? true,
    capacities,
  };
}

export function mapProductPage(response: PagedResponse<ProductDto>): ProductPage {
  return { ...response, items: response.items.map(mapProduct) };
}
