"use client";

import { useEffect, useState, type RefObject } from "react";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import type { PackagingType } from "@/features/cart/cart-provider";
import { ProductPackagingSelector } from "@/features/products/components/product-packaging-selector";
import { getStorePackagingSettings, type PublicPackagingSettings } from "@/features/products/product-api";
import { getDefaultCapacity, selectProductCapacity } from "@/features/products/product-selection";
import type { Product, ProductCapacityOption } from "@/features/products/models";

import { WishlistButton } from "@/features/account/components/wishlist-button";

export function ProductCapacityDetails({ product, selectedSize, onSelect, purchaseAnchor }: { product: Product; selectedSize: number; onSelect: (option: ProductCapacityOption) => void; purchaseAnchor: RefObject<HTMLDivElement | null> }) {
  const capacities = [...product.capacities].sort((first, second) => first.tableCapacity - second.tableCapacity);
  const selectedOption = capacities.find((option) => option.tableCapacity === selectedSize) ?? getDefaultCapacity(product);
  const activeProduct = selectedOption ? selectProductCapacity(product, selectedOption) : product;

  const [selectedPackaging, setSelectedPackaging] = useState<PackagingType>("Standard");
  const [packagingSettings, setPackagingSettings] = useState<PublicPackagingSettings>({
    giftPackagingPrice: 200000,
    isGiftPackagingEnabled: true,
  });

  useEffect(() => {
    getStorePackagingSettings().then(setPackagingSettings).catch(() => {});
  }, []);

  const effectivePackaging: PackagingType = (selectedPackaging === "GiftBox" && packagingSettings.isGiftPackagingEnabled)
    ? "GiftBox"
    : "Standard";
  const effectiveFee = effectivePackaging === "GiftBox" ? packagingSettings.giftPackagingPrice : 0;

  const displayedPriceValue = (selectedOption?.priceValue ?? activeProduct.priceValue) + effectiveFee;
  const displayedPrice = `${new Intl.NumberFormat("fa-IR").format(displayedPriceValue)} تومان`;

  return <>
    {selectedOption?.hasDiscount && selectedOption.compareAtPrice ? (
      <div className="product-detail__price-wrap">
        <s className="price-compare price-compare--lg">
          {effectiveFee > 0 && selectedOption.compareAtPriceValue
            ? `${new Intl.NumberFormat("fa-IR").format(selectedOption.compareAtPriceValue + effectiveFee)} تومان`
            : selectedOption.compareAtPrice}
        </s>
        <strong className="product-detail__price">{displayedPrice}</strong>
        {selectedOption.discountPercent && <span className="discount-badge">{new Intl.NumberFormat("fa-IR").format(selectedOption.discountPercent)}٪ تخفیف</span>}
      </div>
    ) : <strong className="product-detail__price">{displayedPrice}</strong>}

    <fieldset className="capacity-selector"><legend>انتخاب ظرفیت</legend><div className="capacity-options">
      {capacities.map((option) => {
        const isSelected = option.tableCapacity === selectedSize;
        return <button type="button" className={`capacity-option${isSelected ? " capacity-option--selected" : ""}${!option.isAvailable ? " capacity-option--unavailable" : ""}`} disabled={!option.isAvailable} aria-pressed={isSelected} key={option.tableCapacity} onClick={() => onSelect(option)}><strong>{option.capacityLabel}</strong><span>{option.isAvailable ? "موجود" : "ناموجود"}</span></button>;
      })}
    </div></fieldset>

    <ProductPackagingSelector
      selectedPackaging={selectedPackaging}
      onChange={setSelectedPackaging}
      giftPrice={packagingSettings.giftPackagingPrice}
      isGiftEnabled={packagingSettings.isGiftPackagingEnabled}
    />

    <dl className="product-quick-specs">
      <div><dt>ابعاد</dt><dd>{activeProduct.dimensions}</dd></div>
      <div><dt>رویه</dt><dd>{product.fabricType}</dd></div>
      <div><dt>آستر</dt><dd>{product.lining}</dd></div>
      <div><dt>کد محصول</dt><dd dir="ltr">{activeProduct.sku}</dd></div>
    </dl>
    <div ref={purchaseAnchor} className="product-purchase-actions">
      <div className="product-purchase-main">
        <AddToCartButton
          product={activeProduct}
          packagingType={effectivePackaging}
          packagingFee={effectiveFee}
        />
      </div>
      <WishlistButton
        productId={product.id}
        productName={product.name}
        className="product-purchase-wishlist"
      />
    </div>
  </>;
}
