import type { Metadata } from "next";
import { AccountLoginClient } from "@/features/account/account-login-client";
export const metadata: Metadata = { title: "ورود به حساب | ترما", description: "ورود مشتری با شماره موبایل و کد تأیید" };
export default function AccountLoginPage() { return <AccountLoginClient />; }
