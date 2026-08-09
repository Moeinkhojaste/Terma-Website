"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ProductCard } from "@/features/products/components/product-card";
import type { Product } from "@/features/products/data/products";

const AUTO_PLAY_DELAY = 4500;

export function ProductCarousel({ products }: { products: Product[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const visibleProducts = useMemo(
    () => products.map((_, offset) => products[(index + offset) % products.length]),
    [index, products],
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || products.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % products.length),
      AUTO_PLAY_DELAY,
    );
    return () => window.clearInterval(timer);
  }, [paused, products.length, reducedMotion]);

  const previous = () => setIndex((current) => (current - 1 + products.length) % products.length);
  const next = () => setIndex((current) => (current + 1) % products.length);

  if (products.length === 0) return null;

  return (
    <div
      className="product-carousel"
      aria-label="محصولات منتخب"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="product-carousel__viewport">
        <div className="product-carousel__track" key={index}>
          {visibleProducts.map((product) => (
            <div className="product-carousel__slide" key={product.id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
      <div className="product-carousel__footer">
        <div className="carousel-controls">
          <button className="carousel-button carousel-button--previous" type="button" onClick={previous} aria-label="محصول قبلی">
            <ArrowLeftIcon />
          </button>
          <button className="carousel-button" type="button" onClick={next} aria-label="محصول بعدی">
            <ArrowLeftIcon />
          </button>
        </div>
        <div className="carousel-dots" aria-label="انتخاب اسلاید">
          {products.map((product, dotIndex) => (
            <button
              className={dotIndex === index ? "carousel-dot carousel-dot--active" : "carousel-dot"}
              type="button"
              onClick={() => setIndex(dotIndex)}
              aria-label={`نمایش ${product.name}`}
              aria-current={dotIndex === index ? "true" : undefined}
              key={product.id}
            />
          ))}
        </div>
        <p aria-live="polite">نمایش {index + 1} از {products.length}</p>
      </div>
    </div>
  );
}
