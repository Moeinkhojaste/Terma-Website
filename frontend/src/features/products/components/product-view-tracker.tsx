"use client";

import { useEffect, useRef } from "react";
import { recordRecentlyViewed } from "@/features/products/recently-viewed";
import { apiRequest } from "@/lib/api-client";

export function ProductViewTracker({ productId }: { productId: string }) {
  const trackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    recordRecentlyViewed(productId);

    // Prevent duplicate triggers in same component lifecycle / StrictMode
    if (trackedRef.current === productId) return;
    trackedRef.current = productId;

    // Prevent duplicate API calls within 10 minutes in the same browser session
    try {
      const storageKey = `terma_view_${productId}`;
      const lastView = sessionStorage.getItem(storageKey);
      const now = Date.now();

      if (lastView && now - Number(lastView) < 10 * 60 * 1000) {
        return;
      }

      sessionStorage.setItem(storageKey, String(now));
    } catch {
      // sessionStorage might be restricted in private mode, proceed gracefully
    }

    apiRequest(`/api/products/${productId}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // Silently ignore view recording errors on client side
    });
  }, [productId]);

  return null;
}

