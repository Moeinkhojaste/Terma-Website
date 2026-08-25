import type { Metadata } from "next";
import { CmsPageView } from "@/features/content/cms-page-view";
import { cmsMetadata } from "@/features/content/cms-metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return cmsMetadata((await params).slug);
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ cmsPreview?: string }> }) {
  return <CmsPageView slug={(await params).slug} previewId={(await searchParams).cmsPreview} />;
}
