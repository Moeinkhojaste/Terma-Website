import ProductsPage, { generateMetadata, metadata } from "@/features/products/components/products-page";

export const dynamic = "force-dynamic";
export { generateMetadata, metadata };

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ cmsPreview?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <ProductsPage previewId={resolvedSearchParams?.cmsPreview} />;
}
