"use client";

import type { RefObject } from "react";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { getDefaultCapacity, selectProductCapacity } from "@/features/products/product-selection";
import type { Product, ProductCapacityOption } from "@/features/products/models";

export function ProductCapacityDetails({ product, selectedSize, onSelect, purchaseAnchor }: { product: Product; selectedSize: number; onSelect: (option: ProductCapacityOption) => void; purchaseAnchor: RefObject<HTMLDivElement | null> }) {
  const capacities = [...product.capacities].sort((first, second) => first.tableCapacity - second.tableCapacity);
  const selectedOption = capacities.find((option) => option.tableCapacity === selectedSize) ?? getDefaultCapacity(product);
  const activeProduct = selectedOption ? selectProductCapacity(product, selectedOption) : product;

  return <>
    {selectedOption?.hasDiscount && selectedOption.compareAtPrice ? (
      <div className="product-detail__price-wrap"><s className="price-compare price-compare--lg">{selectedOption.compareAtPrice}</s><strong className="product-detail__price">{selectedOption.price}</strong>{selectedOption.discountPercent && <span className="discount-badge">{new Intl.NumberFormat("fa-IR").format(selectedOption.discountPercent)}٪ تخفیف</span>}</div>
    ) : <strong className="product-detail__price">{activeProduct.price}</strong>}

    <fieldset className="capacity-selector"><legend>انتخاب ظرفیت</legend><div className="capacity-options">
      {capacities.map((option) => {
        const isSelected = option.tableCapacity === selectedSize;
        return <button type="button" className={`capacity-option${isSelected ? " capacity-option--selected" : ""}${!option.isAvailable ? " capacity-option--unavailable" : ""}`} disabled={!option.isAvailable} aria-pressed={isSelected} key={option.tableCapacity} onClick={() => onSelect(option)}><strong>{option.capacityLabel}</strong><span>{option.isAvailable ? "موجود" : "ناموجود"}</span></button>;
      })}
    </div></fieldset>

    <dl className="product-quick-specs">
      <div><dt>ابعاد</dt><dd>{activeProduct.dimensions}</dd></div>
      <div><dt>رویه</dt><dd>{product.fabricType}</dd></div>
      <div><dt>آستر</dt><dd>{product.lining}</dd></div>
      <div><dt>کد محصول</dt><dd dir="ltr">{activeProduct.sku}</dd></div>
    </dl>
    <div ref={purchaseAnchor} className="product-purchase-anchor"><AddToCartButton product={activeProduct} /></div>
  </>;
}
