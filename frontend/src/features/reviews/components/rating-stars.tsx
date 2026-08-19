"use client";

import { useState } from "react";
import { StarFilledIcon, StarIcon } from "@/components/ui/icons";

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "۱ ستاره - بسیار ضعیف",
  2: "۲ ستاره - ضعیف",
  3: "۳ ستاره - معمولی",
  4: "۴ ستاره - خوب",
  5: "۵ ستاره - عالی و بی‌نظیر",
};

export function RatingStars({
  rating,
  maxStars = 5,
  size = "md",
  interactive = false,
  onRatingChange,
  className = "",
}: RatingStarsProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const iconSizes = {
    sm: "size-3.5",
    md: "size-4.5",
    lg: "size-6",
  };

  const currentRating = hoverRating ?? rating;

  if (interactive) {
    return (
      <div className={`rating-stars rating-stars--interactive ${className}`} dir="rtl">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="انتخاب امتیاز محصول">
          {Array.from({ length: maxStars }, (_, index) => {
            const starValue = index + 1;
            const isFilled = starValue <= currentRating;

            return (
              <button
                key={starValue}
                type="button"
                role="radio"
                aria-checked={rating === starValue}
                aria-label={RATING_LABELS[starValue]}
                onClick={() => onRatingChange?.(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(null)}
                className={`rating-star-btn transition-transform hover:scale-125 focus:outline-none ${
                  isFilled ? "text-amber-500" : "text-stone-300 hover:text-amber-400"
                }`}
              >
                {isFilled ? (
                  <StarFilledIcon className={iconSizes[size]} />
                ) : (
                  <StarIcon className={iconSizes[size]} />
                )}
              </button>
            );
          })}
        </div>
        {currentRating > 0 && (
          <span className="rating-label text-xs font-semibold text-amber-800 mt-1 block">
            {RATING_LABELS[Math.round(currentRating)]}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rating-stars flex items-center gap-1 text-amber-500 ${className}`}
      dir="rtl"
      aria-label={`امتیاز ${new Intl.NumberFormat("fa-IR").format(rating)} از ۵`}
    >
      {Array.from({ length: maxStars }, (_, index) => {
        const starValue = index + 1;
        const isFilled = rating >= starValue;
        const isHalf = !isFilled && rating >= starValue - 0.5;

        return (
          <span key={starValue} className="inline-block">
            {isFilled ? (
              <StarFilledIcon className={iconSizes[size]} />
            ) : isHalf ? (
              <span className="relative inline-block">
                <StarIcon className={`${iconSizes[size]} text-stone-300`} />
                <span
                  className="absolute inset-0 overflow-hidden text-amber-500"
                  style={{ width: "50%" }}
                >
                  <StarFilledIcon className={iconSizes[size]} />
                </span>
              </span>
            ) : (
              <StarIcon className={`${iconSizes[size]} text-stone-300`} />
            )}
          </span>
        );
      })}
    </div>
  );
}
