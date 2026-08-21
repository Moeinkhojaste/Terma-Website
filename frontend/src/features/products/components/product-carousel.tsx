"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ProductCard } from "@/features/products/components/product-card";
import type { Product } from "@/features/products/models";

const AUTO_PLAY_DELAY = 4500;

interface ProductCarouselProps {
  products: Product[];
}

export function ProductCarousel({ products }: ProductCarouselProps) {
  const carouselId = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const didDragRef = useRef(false);

  // Determine visible item count based on responsive breakpoints
  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateVisibleCount = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(1);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(2);
      } else {
        setVisibleCount(3);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  // Respect user preference for reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  const maxIndex = useMemo(() => Math.max(0, products.length - visibleCount), [products.length, visibleCount]);
  const clampedIndex = Math.min(index, maxIndex);
  const totalSteps = maxIndex + 1;

  // Auto-play timer
  useEffect(() => {
    if (paused || isDragging || reducedMotion || maxIndex === 0) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, AUTO_PLAY_DELAY);
    return () => window.clearInterval(timer);
  }, [paused, isDragging, reducedMotion, maxIndex]);

  const goToPrevious = useCallback(() => {
    if (maxIndex === 0) return;
    setIndex((current) => (current <= 0 ? maxIndex : current - 1));
  }, [maxIndex]);

  const goToNext = useCallback(() => {
    if (maxIndex === 0) return;
    setIndex((current) => (current >= maxIndex ? 0 : current + 1));
  }, [maxIndex]);

  // Pointer & touch swipe handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    setPaused(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    didDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!isDragging) {
      if (Math.abs(dx) > 7 && Math.abs(dx) > Math.abs(dy)) {
        setIsDragging(true);
        didDragRef.current = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
      } else if (Math.abs(dy) > 7) {
        dragStartRef.current = null;
        return;
      }
    }

    if (isDragging) {
      let effectiveDx = dx;
      // Rubber-band resistance on boundaries
      if ((clampedIndex === 0 && dx > 0) || (clampedIndex === maxIndex && dx < 0)) {
        effectiveDx = dx * 0.28;
      }
      setDragDelta(effectiveDx);
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    if (isDragging) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}

      const dx = e.clientX - dragStartRef.current.x;
      const dt = Date.now() - dragStartRef.current.time;
      const velocity = Math.abs(dx) / Math.max(1, dt);

      const threshold = 40;
      const isQuickFlick = velocity > 0.35 && Math.abs(dx) > 18;

      // In RTL coordinate system:
      // dx < 0 (drag left) means advance forward (Next)
      // dx > 0 (drag right) means go back (Previous)
      if (dx < -threshold || (isQuickFlick && dx < 0)) {
        if (clampedIndex < maxIndex) {
          setIndex((curr) => Math.min(curr + 1, maxIndex));
        } else {
          setIndex(0);
        }
      } else if (dx > threshold || (isQuickFlick && dx > 0)) {
        if (clampedIndex > 0) {
          setIndex((curr) => Math.max(curr - 1, 0));
        } else {
          setIndex(maxIndex);
        }
      }
    }

    dragStartRef.current = null;
    setIsDragging(false);
    setDragDelta(0);

    setTimeout(() => {
      didDragRef.current = false;
    }, 60);
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      // In RTL, ArrowLeft advances forward
      e.preventDefault();
      goToNext();
    } else if (e.key === "ArrowRight") {
      // In RTL, ArrowRight moves backward
      e.preventDefault();
      goToPrevious();
    } else if (e.key === "Home") {
      e.preventDefault();
      setIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setIndex(maxIndex);
    }
  };

  if (products.length === 0) return null;

  const trackStyle = {
    "--carousel-index": clampedIndex,
    "--carousel-drag": `${dragDelta}px`,
  } as React.CSSProperties;

  const currentDisplayNumber = new Intl.NumberFormat("fa-IR").format(clampedIndex + 1);
  const totalDisplayNumber = new Intl.NumberFormat("fa-IR").format(totalSteps);

  return (
    <section
      className="product-carousel"
      aria-label="محصولات منتخب"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
    >
      <div
        className={`product-carousel__viewport ${isDragging ? "is-dragging" : ""}`}
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClickCapture={handleClickCapture}
      >
        <div
          className={`product-carousel__track ${isDragging ? "is-dragging" : ""}`}
          style={trackStyle}
        >
          {products.map((product, productIndex) => (
            <div
              className="product-carousel__slide"
              key={product.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`محصول ${productIndex + 1} از ${products.length}: ${product.name}`}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      <div className="product-carousel__footer">
        <div className="carousel-counter" aria-live="polite">
          <span>نمایش</span>
          <span className="carousel-counter__current">{currentDisplayNumber}</span>
          <span className="carousel-counter__divider">از</span>
          <span className="carousel-counter__total">{totalDisplayNumber}</span>
        </div>

        <div className="carousel-dots" role="tablist" aria-label="انتخاب اسلاید">
          {Array.from({ length: totalSteps }).map((_, dotIndex) => (
            <button
              key={`${carouselId}-dot-${dotIndex}`}
              className={dotIndex === clampedIndex ? "carousel-dot carousel-dot--active" : "carousel-dot"}
              type="button"
              role="tab"
              aria-selected={dotIndex === clampedIndex}
              onClick={() => setIndex(dotIndex)}
              aria-label={`نمایش بخش ${dotIndex + 1} از ${totalSteps}`}
            />
          ))}
        </div>

        <div className="carousel-controls">
          <button
            className="carousel-button carousel-button--previous"
            type="button"
            onClick={goToPrevious}
            aria-label="محصول قبلی"
            disabled={maxIndex === 0}
            title="محصول قبلی"
          >
            <ArrowLeftIcon />
          </button>
          <button
            className="carousel-button carousel-button--next"
            type="button"
            onClick={goToNext}
            aria-label="محصول بعدی"
            disabled={maxIndex === 0}
            title="محصول بعدی"
          >
            <ArrowLeftIcon />
          </button>
        </div>
      </div>
    </section>
  );
}
