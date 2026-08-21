"use client";

import { useState, type MouseEvent } from "react";
import { HeartIcon, HeartFilledIcon } from "@/components/ui/icons";
import { useWishlist } from "@/features/account/wishlist-context";

type WishlistButtonProps = {
  productId: string;
  productName?: string;
  className?: string;
  variant?: "icon" | "pill";
};

export function WishlistButton({
  productId,
  productName,
  className = "",
  variant = "icon",
}: WishlistButtonProps) {
  const { isFavorite, toggleFavorite } = useWishlist();
  const [animating, setAnimating] = useState(false);
  const favorite = isFavorite(productId);

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    try {
      await toggleFavorite(productId);
    } finally {
      setTimeout(() => setAnimating(false), 300);
    }
  }

  const label = favorite
    ? `حذف ${productName ?? "محصول"} از علاقه‌مندی‌ها`
    : `افزودن ${productName ?? "محصول"} به علاقه‌مندی‌ها`;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`wishlist-pill-button ${favorite ? "wishlist-pill-button--active" : ""} ${animating ? "heart-pop" : ""} ${className}`}
        aria-label={label}
        aria-pressed={favorite}
      >
        {favorite ? <HeartFilledIcon className="size-5 text-red-500" /> : <HeartIcon className="size-5" />}
        <span>{favorite ? "در لیست علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`wishlist-icon-button ${favorite ? "wishlist-icon-button--active" : ""} ${animating ? "heart-pop" : ""} ${className}`}
      aria-label={label}
      aria-pressed={favorite}
      title={label}
    >
      {favorite ? <HeartFilledIcon className="size-5 text-red-500" /> : <HeartIcon className="size-5" />}
    </button>
  );
}
