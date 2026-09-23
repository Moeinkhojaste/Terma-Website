"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { toPersianDigits } from "@/lib/format";

export interface HeroSlideItem {
  src: string;
  alt?: string;
}

const DEFAULT_SLIDES: HeroSlideItem[] = [
  {
    src: "/images/firoozeh-folded.webp",
    alt: "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی",
  },
  {
    src: "/images/lajvard-folded.webp",
    alt: "سفره ترمه لاجورد با نقش‌های سفید و مسی",
  },
  {
    src: "/images/nila-folded.webp",
    alt: "سفره ترمه نیلا با نقش‌های بته‌جقه آبی",
  },
];

const SLIDE_DURATION = 5000;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    () => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
      }
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },
    () => false,
  );
}

export function HeroSlideshow({ slides = DEFAULT_SLIDES }: { slides?: HeroSlideItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    if (isPaused || reducedMotion || slides.length <= 1) return;
    const interval = setInterval(goToNext, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, [isPaused, reducedMotion, slides.length, goToNext]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goToNext();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goToPrev();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const diffY = e.changedTouches[0].clientY - touchStartRef.current.y;
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    touchStartRef.current = null;
  };

  return (
    <figure
      className="hero-visual hero-slideshow"
      role="region"
      aria-roledescription="carousel"
      aria-label="نمایش تصاویر سفره‌های ترمه"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsPaused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
    >
      {/* Slides Container */}
      <div className="hero-slideshow__viewport">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.src}
              className={`hero-slideshow__slide ${isActive ? "is-active" : ""}`}
              aria-hidden={!isActive}
            >
              <Image
                src={slide.src}
                alt={slide.alt || ""}
                fill
                priority={index === 0}
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(max-width: 767px) 92vw, 55vw"
                className="hero-slideshow__image"
                unoptimized={slide.src.startsWith("http") || slide.src.startsWith("/api/")}
              />
              <div className="hero-slideshow__ambient-shadow" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      {/* Top Story-Style Progress Bars */}
      <div className="hero-slideshow__progress" role="tablist" aria-label="انتخاب تصویر">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          const isPassed = index < currentIndex;
          return (
            <button
              key={`progress-${slide.src}-${index}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`نمایش تصویر ${toPersianDigits(index + 1)}`}
              className={`hero-slideshow__bar ${isActive ? "is-active" : isPassed ? "is-passed" : ""}`}
              onClick={() => setCurrentIndex(index)}
            >
              <span
                className="hero-slideshow__bar-fill"
                style={{
                  animationDuration: `${SLIDE_DURATION}ms`,
                  animationPlayState: isPaused ? "paused" : "running",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Navigation Arrows on Hover */}
      <div className="hero-slideshow__controls" aria-label="کنترل‌های اسلایدشو">
        <button
          type="button"
          onClick={goToPrev}
          className="hero-slideshow__nav hero-slideshow__nav--prev"
          aria-label="تصویر قبلی"
          title="تصویر قبلی"
        >
          <ArrowLeftIcon />
        </button>
        <button
          type="button"
          onClick={goToNext}
          className="hero-slideshow__nav hero-slideshow__nav--next"
          aria-label="تصویر بعدی"
          title="تصویر بعدی"
        >
          <ArrowLeftIcon />
        </button>
      </div>
    </figure>
  );
}
