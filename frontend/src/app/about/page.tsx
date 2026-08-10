import type { Metadata } from "next";
import { AboutPage } from "@/features/brand/about-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "درباره ما | ترما",
  description: "با داستان ترما، اصول معرفی محصولات و مسیر انتخاب سفره‌های ترمه آشنا شوید.",
};

export default AboutPage;
