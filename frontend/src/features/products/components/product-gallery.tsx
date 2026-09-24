"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { ArrowLeftIcon, XIcon, ZoomInIcon, ZoomOutIcon } from "@/components/ui/icons";
import { isUnoptimizedMedia } from "@/lib/media";
import type { ProductMedia } from "@/features/products/models";



export function ProductGallery({ media, productName, isUnavailable = false }: { media: ProductMedia[]; productName: string; isUnavailable?: boolean }) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const touchStart = useRef<number | undefined>(undefined);
  const current = media[index] ?? media[0];

  const move = useCallback((direction: number) => {
    setIndex((value) => (value + direction + media.length) % media.length);
    setZoom(1);
  }, [media.length]);

  useEffect(() => {
    if (!viewerOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") move(1);
      if (event.key === "ArrowRight") move(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerOpen, move]);

  if (!current) return null;
  const handleTouchEnd = (clientX: number) => {
    if (touchStart.current === undefined || zoom > 1) return;
    const distance = clientX - touchStart.current;
    if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
    touchStart.current = undefined;
  };

  return (
    <div className="product-gallery" aria-label={`تصاویر ${productName}`}>
      <div className="product-gallery__stage" onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}>
        <button type="button" className="product-gallery__open" onClick={() => setViewerOpen(true)} aria-label={`نمایش تمام‌صفحه ${current.alt}`}>
          <Image src={current.src} alt={current.alt} fill priority={index === 0} sizes="(max-width: 900px) 94vw, 54vw" unoptimized={isUnoptimizedMedia(current.src)} />
          <span className="product-gallery__zoom-hint"><ZoomInIcon /> برای بزرگ‌نمایی لمس کنید</span>
        </button>
        {isUnavailable && <span className="gallery-unavailable-badge">ناموجود</span>}
        {media.length > 1 && <>
          <button type="button" className="gallery-nav gallery-nav--previous" onClick={() => move(-1)} aria-label="تصویر قبلی"><ArrowLeftIcon /></button>
          <button type="button" className="gallery-nav gallery-nav--next" onClick={() => move(1)} aria-label="تصویر بعدی"><ArrowLeftIcon /></button>
        </>}
        <span className="product-gallery__counter" aria-live="polite">{new Intl.NumberFormat("fa-IR").format(index + 1)} / {new Intl.NumberFormat("fa-IR").format(media.length)}</span>
      </div>
      <div className="product-gallery__thumbnails" role="list" aria-label="انتخاب تصویر">
        {media.map((item, itemIndex) => (
          <button
            type="button"
            role="listitem"
            className={itemIndex === index ? "is-active" : ""}
            onClick={() => { setIndex(itemIndex); setZoom(1); }}
            aria-label={`تصویر ${new Intl.NumberFormat("fa-IR").format(itemIndex + 1)}`}
            aria-current={itemIndex === index ? "true" : undefined}
            key={item.id}
          >
            <span><Image src={item.src} alt="" fill sizes="88px" unoptimized={isUnoptimizedMedia(item.src)} /></span>
          </button>
        ))}
      </div>

      <AccessibleDialog open={viewerOpen} onClose={() => { setViewerOpen(false); setZoom(1); }} className="gallery-viewer" label={`نمایش تمام‌صفحه تصاویر ${productName}`}>
        <div className="gallery-viewer__toolbar">
          <div>
            <button type="button" onClick={() => setZoom((value) => Math.max(1, value - 1))} disabled={zoom === 1} aria-label="کاهش بزرگ‌نمایی"><ZoomOutIcon /></button>
            <span>{new Intl.NumberFormat("fa-IR").format(zoom)}×</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, value + 1))} disabled={zoom === 3} aria-label="افزایش بزرگ‌نمایی"><ZoomInIcon /></button>
            <button type="button" onClick={() => { setViewerOpen(false); setZoom(1); }} aria-label="بستن نمایش تمام‌صفحه"><XIcon /></button>
          </div>
        </div>
        <div className={`gallery-viewer__image${zoom > 1 ? " is-zoomed" : ""}`} onClick={() => setZoom((value) => value === 1 ? 2 : 1)} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={(event) => handleTouchEnd(event.changedTouches[0].clientX)}>
          {viewerOpen && (
            <div style={{ transform: `scale(${zoom})` }}>
              <Image src={current.src} alt={current.alt} fill sizes="100vw" unoptimized={isUnoptimizedMedia(current.src)} />
            </div>
          )}
        </div>
        {media.length > 1 && <div className="gallery-viewer__navigation"><button type="button" onClick={() => move(-1)}><ArrowLeftIcon /> تصویر قبلی</button><span>{index + 1} از {media.length}</span><button type="button" onClick={() => move(1)}>تصویر بعدی <ArrowLeftIcon /></button></div>}
      </AccessibleDialog>
    </div>
  );
}
