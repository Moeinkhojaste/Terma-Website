import type { Product, ProductCapacityOption } from "@/features/products/models";

export function getDefaultCapacity(product: Product) {
  return product.capacities.find((option) => option.tableCapacity === product.size && option.isAvailable)
    ?? product.capacities.find((option) => option.isAvailable)
    ?? product.capacities[0];
}

export function selectProductCapacity(product: Product, option: ProductCapacityOption): Product {
  return {
    ...product,
    variantId: option.id,
    size: option.tableCapacity,
    capacity: option.capacityLabel,
    dimensions: option.dimensions,
    price: option.price,
    priceValue: option.priceValue,
    compareAtPrice: option.compareAtPrice,
    compareAtPriceValue: option.compareAtPriceValue,
    discountPercent: option.discountPercent,
    hasDiscount: Boolean(option.hasDiscount),
    stockQuantity: option.stockQuantity,
    stock: option.stockQuantity > 0 ? "موجود" : "ناموجود",
    sku: option.sku || product.sku,
  };
}
