import { formatPrice } from "@/lib/format";
import type { Product, ProductDto, ProductPage, PagedResponse } from "@/features/products/models";

const PRODUCT_PLACEHOLDER = "/images/product-placeholder.svg";

function formatDecimal(value: number) {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
}

export function mapProduct(dto: ProductDto): Product {
  const description = dto.description?.trim() || "اطلاعات تکمیلی این محصول به‌زودی ثبت می‌شود.";
  return {
    id: dto.id,
    name: dto.name,
    size: dto.tableCapacity,
    capacity: `${new Intl.NumberFormat("fa-IR").format(dto.tableCapacity)} نفره`,
    dimensions: `${formatDecimal(dto.length)} × ${formatDecimal(dto.width)} سانتی‌متر`,
    price: formatPrice(dto.price),
    priceValue: dto.price,
    stockQuantity: dto.stockQuantity,
    stock: dto.stockQuantity > 0 ? "موجود" : "ناموجود",
    sku: dto.sku,
    fabricType: dto.fabricType,
    lining: dto.liningType,
    colors: dto.color,
    pattern: dto.pattern,
    image: PRODUCT_PLACEHOLDER,
    tableImage: PRODUCT_PLACEHOLDER,
    imageAlt: `تصویر ${dto.name} هنوز بارگذاری نشده است`,
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
