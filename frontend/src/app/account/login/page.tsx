import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountLoginClient } from "@/features/account/account-login-client";

export const metadata: Metadata = {
  title: "ورود به حساب کاربری | ترما",
  description: "ورود به حساب کاربری فروشگاه ترما با شماره موبایل و کد تأیید یکبار مصرف",
};

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<div className="account-auth-loading">در حال بارگذاری…</div>}>
      <AccountLoginClient />
    </Suspense>
  );
}
