"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, EyeIcon } from "@/components/ui/icons";
import { ProductQuickView } from "@/features/products/components/product-quick-view";
import type { Product } from "@/features/products/models";

export function ProductCard({ product, unavailable = false }: { product: Product; unavailable?: boolean }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  unavailable = unavailable || product.stockQuantity === 0;
  return (
    <article className="product-card" id={`product-${product.id}`}>
      <Link className="product-card__link" href={`/products/${product.slug || product.id}`}>
        <div className="product-image-wrap">
          <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, 31vw" className="product-image" />
        </div>
        <div className="product-card__body">
          <div className="product-meta">
            <span className={unavailable ? "stock stock--off" : "stock"}>{unavailable ? "ناموجود" : product.stock}</span>
            {product.hasDiscount && product.discountPercent && <span className="discount-badge">{new Intl.NumberFormat("fa-IR").format(product.discountPercent)}٪ تخفیف</span>}
          </div>
          <h3>{product.name}</h3>
          <p className="product-description">{product.description}</p>
          <div className="product-card__footer">
            {product.hasDiscount && product.compareAtPrice ? <div className="product-card__prices"><s className="price-compare">{product.compareAtPrice}</s><strong>{product.price}</strong></div> : <strong>{product.price}</strong>}
            <span className="card-action">مشاهده محصول <ArrowLeftIcon /></span>
          </div>
        </div>
      </Link>
      <button className="product-card__quick-view" type="button" onClick={() => setQuickViewOpen(true)} aria-label={`مشاهده سریع ${product.name}`}><EyeIcon /><span>مشاهده سریع</span></button>
      <ProductQuickView product={product} open={quickViewOpen} onClose={() => setQuickViewOpen(false)} />
    </article>
  );
}
