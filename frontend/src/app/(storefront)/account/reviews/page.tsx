import type { Metadata } from "next";
import { AccountReviewsClient } from "@/features/account/account-reviews-client";

export const metadata: Metadata = {
  title: "نظرات من | ترما",
  robots: { index: false, follow: false },
};

export default function AccountReviewsPage() {
  return <AccountReviewsClient />;
}
