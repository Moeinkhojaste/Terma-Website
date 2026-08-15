"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountShell } from "./components/account-shell";
import { useWishlist } from "./wishlist-context";
import { getWishlist, type WishlistItem } from "./account-api";
import { formatPrice } from "@/lib/format";
import { HeartIcon, TrashIcon, ArrowLeftIcon } from "@/components/ui/icons";

import { getApiBaseUrl } from "@/lib/api-client";

function getWishlistItemImage(item: WishlistItem): string {
  if (item.imageUrl && item.imageUrl.trim()) {
    const url = item.imageUrl.trim();
    if (/^https?:\/\//i.test(url) || url.startsWith("/images/")) {
      return url;
    }
    if (url.startsWith("/api/")) {
      return `${getApiBaseUrl()}${url}`;
    }
    return url;
  }

  const text = `${item.productName} ${item.productSlug}`.toLowerCase();
  if (text.includes("نیلا") || text.includes("nila")) {
    return "/images/nila-folded.webp";
  }
  if (text.includes("لاجورد") || text.includes("lajvard")) {
    return "/images/lajvard-folded.webp";
  }
  if (text.includes("فیروزه") || text.includes("firoozeh")) {
    return "/images/firoozeh-folded.webp";
  }

  return "/images/product-placeholder.svg";
}

export function AccountWishlistClient() {
  const { toggleFavorite, refreshWishlist } = useWishlist();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getWishlist()
      .then(setItems)
      .catch((err) => setError(err.message || "خطا در دریافت لیست علاقه‌مندی‌ها"))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(productId: string) {
    try {
      await toggleFavorite(productId);
      setItems((prev) => prev.filter((x) => x.productId !== productId));
      await refreshWishlist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "خطا در حذف محصول");
    }
  }

  return (
    <AccountShell title="علاقه‌مندی‌ها" breadcrumbs={[{ label: "علاقه‌مندی‌ها" }]}>
      <div className="account-wishlist-view">
        <p className="wishlist-desc">
          کالاهایی که نشان کرده‌اید در این بخش ذخیره شده‌اند تا هر زمان مایل بودید به آنها دسترسی داشته باشید.
        </p>

        {loading ? (
          <div className="cart-loading" role="status">
            در حال بارگذاری لیست علاقه‌مندی‌ها…
          </div>
        ) : error ? (
          <div className="account-error" role="alert">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="commerce-empty">
            <HeartIcon className="size-12 text-slate-400" />
            <h2>لیست علاقه‌مندی‌های شما خالی است</h2>
            <p>می‌توانید با کلیک روی نشان قلب در صفحه محصولات، کالاهای مورد علاقه خود را ذخیره کنید.</p>
            <Link className="button button--primary" href="/products">
              مشاهده محصولات
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => {
              const imageSrc = getWishlistItemImage(item);
              const productHref = `/products/${item.productSlug || item.productId}`;

              return (
                <div key={item.id} className="wishlist-card">
                  <div className="wishlist-image-wrap">
                    <Link href={productHref} tabIndex={-1} aria-hidden="true" className="wishlist-image-link">
                      <Image
                        src={imageSrc}
                        alt={item.productName}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="wishlist-image"
                      />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.productId)}
                      className="wishlist-remove-btn"
                      title="حذف از علاقه‌مندی‌ها"
                      aria-label={`حذف ${item.productName} از علاقه‌مندی‌ها`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>

                <div className="wishlist-body">
                  <div className="wishlist-meta">
                    <span className="wishlist-category">{item.categoryName || "ترمه فاخر"}</span>
                    <span className={`stock ${item.inStock ? "" : "stock--off"}`}>
                      {item.inStock ? "موجود" : "ناموجود"}
                    </span>
                  </div>

                  <h3 className="wishlist-title">
                    <Link href={`/products/${item.productSlug || item.productId}`}>
                      {item.productName}
                    </Link>
                  </h3>

                  <div className="wishlist-price-row">
                    {item.compareAtPrice && item.compareAtPrice > item.price ? (
                      <div className="wishlist-prices">
                        <s className="price-compare">{formatPrice(item.compareAtPrice)}</s>
                        <strong>{formatPrice(item.price)}</strong>
                      </div>
                    ) : (
                      <strong>{formatPrice(item.price)}</strong>
                    )}
                  </div>

                  <div className="wishlist-actions">
                    <Link
                      href={`/products/${item.productSlug || item.productId}`}
                      className="button button--secondary button--sm wishlist-view-btn"
                    >
                      <span>مشاهده و خرید</span>
                      <ArrowLeftIcon className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </AccountShell>
  );
}
