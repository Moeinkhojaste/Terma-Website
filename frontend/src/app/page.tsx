import HomePage from "@/features/products/components/home-page";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ cmsPreview?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <HomePage previewId={resolvedSearchParams?.cmsPreview} />;
}
