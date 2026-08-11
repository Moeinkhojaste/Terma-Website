import { CmsPageView } from "@/features/content/cms-page-view";
import { cmsMetadata } from "@/features/content/cms-metadata";
export const generateMetadata = () => cmsMetadata("contact");
export default async function Page({ searchParams }: { searchParams: Promise<{ cmsPreview?: string }> }) { return <CmsPageView slug="contact" previewId={(await searchParams).cmsPreview} />; }
