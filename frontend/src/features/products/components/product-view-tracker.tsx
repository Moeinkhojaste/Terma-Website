"use client";

import { useEffect } from "react";
import { recordRecentlyViewed } from "@/features/products/recently-viewed";

export function ProductViewTracker({ productId }: { productId: string }) {
  useEffect(() => { recordRecentlyViewed(productId); }, [productId]);
  return null;
}
