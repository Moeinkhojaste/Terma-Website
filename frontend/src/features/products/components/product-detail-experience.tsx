"use client";

import { useMemo, useRef, useState } from "react";
import { Container } from "@/components/layout/container";
import { ProductCapacityDetails } from "@/features/products/components/product-capacity-details";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductRecommendations } from "@/features/products/components/product-recommendations";
import { ProductReviewsSection } from "@/features/reviews/components/product-reviews-section";
import { ProductViewTracker } from "@/features/products/components/product-view-tracker";
import { StickyProductPurchase } from "@/features/products/components/sticky-product-purchase";
import { getDefaultCapacity, selectProductCapacity } from "@/features/products/product-selection";
import type { Product, ProductCapacityOption } from "@/features/products/models";

export function ProductDetailExperience({ product }: { product: Product }) {
  const defaultCapacity = getDefaultCapacity(product);
  const [selectedSize, setSelectedSize] = useState(defaultCapacity?.tableCapacity ?? product.size);
  const selectedOption = product.capacities.find((option) => option.tableCapacity === selectedSize) ?? defaultCapacity;
  const activeProduct = useMemo(() => selectedOption ? selectProductCapacity(product, selectedOption) : product, [product, selectedOption]);
  const purchaseAnchor = useRef<HTMLDivElement>(null);
  const select = (option: ProductCapacityOption) => { if (option.isAvailable) setSelectedSize(option.tableCapacity); };
  const isUnavailable = !product.isActive || product.stockQuantity === 0 || !activeProduct.isActive || activeProduct.stockQuantity <= 0 || (selectedOption ? !selectedOption.isAvailable : true);

  return <>
    <ProductViewTracker productId={product.id} />
    <section className="product-detail section-pad">
      <Container className="product-detail__grid">
        <div className="product-summary">
          <div className="product-summary__topline">
            <span className={activeProduct.stockQuantity > 0 ? "stock" : "stock stock--off"}>{activeProduct.stock}</span>
            {!isUnavailable && activeProduct.hasDiscount && activeProduct.discountPercent && <span className="discount-badge">{new Intl.NumberFormat("fa-IR").format(activeProduct.discountPercent)}٪ تخفیف</span>}
            <span>{product.categoryName}</span>
            <a href="#reviews" className="text-xs text-amber-700 hover:text-amber-800 font-semibold inline-flex items-center gap-1 mr-auto transition-colors">
              ★ مشاهده نظرات
            </a>
          </div>
          <h1>{product.name}</h1><p>{product.longDescription}</p>
          <ProductCapacityDetails product={product} selectedSize={selectedSize} onSelect={select} purchaseAnchor={purchaseAnchor} />
        </div>
        <ProductGallery media={product.media} productName={product.name} isUnavailable={isUnavailable} />
      </Container>
    </section>
    <StickyProductPurchase product={activeProduct} purchaseAnchor={purchaseAnchor} />
    <section className="product-information section-pad">
      <Container className="product-information__grid">
        <div>
          <p className="section-eyebrow">رنگ و نقش</p>
          <h2>جزئیات محصول</h2>
        </div>
        <dl>
          <div><dt>ترکیب رنگ</dt><dd>{product.colors}</dd></div>
          <div><dt>طرح</dt><dd>{product.pattern}</dd></div>
          <div><dt>دسته‌بندی</dt><dd>{product.categoryName}</dd></div>
          {(product.detailedDescription || product.description) && (
            <div>
              <dt>توضیحات</dt>
              <dd className="product-information__description">{product.detailedDescription || product.description}</dd>
            </div>
          )}
        </dl>
      </Container>
    </section>
    <ProductReviewsSection product={product} />
    <ProductRecommendations productId={product.id} variantId={activeProduct.variantId} />
  </>;
}
