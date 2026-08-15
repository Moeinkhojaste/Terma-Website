"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getWishlistIds, toggleWishlistProduct } from "./account-api";
import { ApiError } from "@/lib/api-client";

type WishlistContextType = {
  favoriteIds: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<boolean>;
  guestModalOpen: boolean;
  setGuestModalOpen: (open: boolean) => void;
  refreshWishlist: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [guestModalOpen, setGuestModalOpen] = useState(false);

  const refreshWishlist = useCallback(async () => {
    try {
      const ids = await getWishlistIds();
      setFavoriteIds(new Set(ids));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    getWishlistIds()
      .then((ids) => {
        setFavoriteIds(new Set(ids));
      })
      .catch(() => {
        setFavoriteIds(new Set());
      });
  }, [pathname]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds]
  );

  const toggleFavorite = useCallback(
    async (productId: string): Promise<boolean> => {
      // 1. Optimistic update
      const wasFav = favoriteIds.has(productId);
      const nextSet = new Set(favoriteIds);
      if (wasFav) {
        nextSet.delete(productId);
      } else {
        nextSet.add(productId);
      }
      setFavoriteIds(nextSet);

      try {
        const result = await toggleWishlistProduct(productId);
        // 2. Synchronize with server response
        setFavoriteIds((current) => {
          const updated = new Set(current);
          if (result.added) updated.add(productId);
          else updated.delete(productId);
          return updated;
        });
        return result.added;
      } catch (err) {
        // 3. Revert optimistic update on failure
        setFavoriteIds(favoriteIds);
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setGuestModalOpen(true);
          return false;
        }
        console.error("Wishlist toggle error:", err);
        return false;
      }
    },
    [favoriteIds]
  );

  return (
    <WishlistContext.Provider
      value={{
        favoriteIds,
        isFavorite,
        toggleFavorite,
        guestModalOpen,
        setGuestModalOpen,
        refreshWishlist,
      }}
    >
      {children}
      {guestModalOpen && (
        <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="guest-wishlist-title">
          <div className="account-modal-card">
            <div className="account-modal-header">
              <h3 id="guest-wishlist-title">ورود به حساب کاربری</h3>
              <button
                type="button"
                className="account-modal-close"
                onClick={() => setGuestModalOpen(false)}
                aria-label="بستن"
              >
                ✕
              </button>
            </div>
            <p className="account-modal-description">
              برای افزودن این محصول به لیست علاقه‌مندی‌ها و ذخیره دائمی آن، لطفاً ابتدا وارد حساب کاربری خود شوید.
            </p>
            <div className="account-modal-actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  setGuestModalOpen(false);
                  router.push(`/account/login?returnUrl=${encodeURIComponent(pathname)}`);
                }}
              >
                ورود به حساب
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setGuestModalOpen(false)}
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
