import type { Metadata } from "next";
import { AccountProfileClient } from "@/features/account/account-profile-client";

export const metadata: Metadata = {
  title: "اطلاعات حساب | ترما",
  robots: { index: false, follow: false },
};

export default function AccountProfilePage() {
  return <AccountProfileClient />;
}
