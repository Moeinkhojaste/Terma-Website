"use client";

import { useState } from "react";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import type { Product, ProductCapacityOption } from "@/features/products/models";

export function ProductCapacityDetails({ product }: { product: Product }) {
  const capacities = product.capacities && product.capacities.length > 0
    ? [...product.capacities].sort((a, b) => a.tableCapacity - b.tableCapacity)
    : [
        {
          tableCapacity: product.size,
          capacityLabel: product.capacity,
          length: 0,
          width: 0,
          dimensions: product.dimensions,
          price: product.price,
          priceValue: product.priceValue,
          compareAtPrice: product.compareAtPrice,
          compareAtPriceValue: product.compareAtPriceValue,
          discountPercent: product.discountPercent,
          hasDiscount: product.hasDiscount,
          stockQuantity: product.stockQuantity,
          isAvailable: product.stockQuantity > 0,
          sku: product.sku,
        },
      ];

  const [selectedSize, setSelectedSize] = useState<number>(() => {
    const match = capacities.find((c) => c.tableCapacity === product.size && c.isAvailable);
    if (match) return match.tableCapacity;
    const firstAvailable = capacities.find((c) => c.isAvailable);
    return firstAvailable?.tableCapacity ?? capacities[0].tableCapacity;
  });

  const selectedOption: ProductCapacityOption =
    capacities.find((c) => c.tableCapacity === selectedSize) ?? capacities[0];

  const activeProduct: Product = {
    ...product,
    size: selectedOption.tableCapacity,
    capacity: selectedOption.capacityLabel,
    dimensions: selectedOption.dimensions,
    price: selectedOption.price,
    priceValue: selectedOption.priceValue,
    compareAtPrice: selectedOption.compareAtPrice,
    compareAtPriceValue: selectedOption.compareAtPriceValue,
    discountPercent: selectedOption.discountPercent,
    hasDiscount: Boolean(selectedOption.hasDiscount),
    stockQuantity: selectedOption.stockQuantity,
    stock: selectedOption.stockQuantity > 0 ? "موجود" : "ناموجود",
    sku: selectedOption.sku || product.sku,
  };

  return (
    <>
      {selectedOption.hasDiscount && selectedOption.compareAtPrice ? (
        <div className="product-detail__price-wrap">
          <s className="price-compare price-compare--lg">{selectedOption.compareAtPrice}</s>
          <strong className="product-detail__price">{selectedOption.price}</strong>
          {selectedOption.discountPercent && (
            <span className="discount-badge">
              {new Intl.NumberFormat("fa-IR").format(selectedOption.discountPercent)}٪ تخفیف
            </span>
          )}
        </div>
      ) : (
        <strong className="product-detail__price">{selectedOption.price}</strong>
      )}

      <div className="capacity-selector">
        <strong>انتخاب ظرفیت</strong>
        <div className="capacity-options">
          {capacities.map((option) => {
            const isSelected = option.tableCapacity === selectedSize;
            const isAvailable = option.isAvailable;

            return (
              <button
                type="button"
                className={`capacity-option${isSelected ? " capacity-option--selected" : ""}${!isAvailable ? " capacity-option--unavailable" : ""}`}
                disabled={!isAvailable}
                aria-pressed={isSelected}
                key={option.tableCapacity}
                onClick={() => isAvailable && setSelectedSize(option.tableCapacity)}
              >
                <strong>{option.capacityLabel}</strong>
                <span>{isAvailable ? "موجود" : "ناموجود"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <dl className="product-quick-specs">
        <div>
          <dt>ابعاد</dt>
          <dd>{selectedOption.dimensions}</dd>
        </div>
        <div>
          <dt>رویه</dt>
          <dd>{product.fabricType}</dd>
        </div>
        <div>
          <dt>آستر</dt>
          <dd>{product.lining}</dd>
        </div>
        <div>
          <dt>کد محصول</dt>
          <dd dir="ltr">{selectedOption.sku}</dd>
        </div>
      </dl>

      <AddToCartButton product={activeProduct} />
    </>
  );
}
