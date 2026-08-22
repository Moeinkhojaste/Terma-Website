import type { Metadata } from "next";
import { AccountWishlistClient } from "@/features/account/account-wishlist-client";

export const metadata: Metadata = {
  title: "علاقه‌مندی‌ها | ترما",
  robots: { index: false, follow: false },
};

export default function AccountWishlistPage() {
  return <AccountWishlistClient />;
}
