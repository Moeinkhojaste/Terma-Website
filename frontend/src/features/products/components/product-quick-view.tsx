"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { XIcon } from "@/components/ui/icons";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { getDefaultCapacity, selectProductCapacity } from "@/features/products/product-selection";
import { isUnoptimizedMedia } from "@/lib/media";
import type { Product } from "@/features/products/models";

export function ProductQuickView({ product, open, onClose }: { product: Product; open: boolean; onClose: () => void }) {
  const defaultCapacity = getDefaultCapacity(product);
  const [capacity, setCapacity] = useState(defaultCapacity?.tableCapacity ?? product.size);
  const selected = product.capacities.find((option) => option.tableCapacity === capacity) ?? defaultCapacity;
  const activeProduct = useMemo(() => selected ? selectProductCapacity(product, selected) : product, [product, selected]);

  return (
    <AccessibleDialog open={open} onClose={onClose} className="quick-view-dialog sheet-dialog" label={`مشاهده سریع ${product.name}`}>
      <div className="quick-view">
        <button className="dialog-close" type="button" onClick={onClose} aria-label="بستن مشاهده سریع"><XIcon className="size-5" /></button>
        <div className="quick-view__image"><Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 92vw, 420px" unoptimized={isUnoptimizedMedia(product.image)} /></div>
        <div className="quick-view__content">
          <span className={activeProduct.stockQuantity > 0 ? "stock" : "stock stock--off"}>{activeProduct.stock}</span>
          <h2>{product.name}</h2>
          <strong className="quick-view__price">{activeProduct.price}</strong>
          <fieldset className="quick-view__capacities">
            <legend>ظرفیت میز</legend>
            <div className="capacity-options">
              {product.capacities.map((option) => (
                <button type="button" className={`capacity-option${capacity === option.tableCapacity ? " capacity-option--selected" : ""}${!option.isAvailable ? " capacity-option--unavailable" : ""}`} disabled={!option.isAvailable} aria-pressed={capacity === option.tableCapacity} onClick={() => setCapacity(option.tableCapacity)} key={option.tableCapacity}>
                  <strong>{option.capacityLabel}</strong><span>{option.isAvailable ? "موجود" : "ناموجود"}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <AddToCartButton product={activeProduct} onOpenCart={onClose} />
          <Link className="text-link quick-view__details" href={`/products/${product.slug || product.id}`} onClick={onClose}>مشاهده همه جزئیات محصول</Link>
        </div>
      </div>
    </AccessibleDialog>
  );
}
