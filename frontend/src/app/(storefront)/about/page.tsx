import { CmsPageView } from "@/features/content/cms-page-view";
import { cmsMetadata } from "@/features/content/cms-metadata";
export const dynamic = "force-dynamic";
export const generateMetadata = () => cmsMetadata("about");
export default async function Page({ searchParams }: { searchParams: Promise<{ cmsPreview?: string }> }) { return <CmsPageView slug="about" previewId={(await searchParams).cmsPreview} />; }
