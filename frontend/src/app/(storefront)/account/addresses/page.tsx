import type { Metadata } from "next";
import { AccountAddressesClient } from "@/features/account/account-addresses-client";

export const metadata: Metadata = {
  title: "آدرس‌های من | ترما",
  robots: { index: false, follow: false },
};

export default function AccountAddressesPage() {
  return <AccountAddressesClient />;
}
