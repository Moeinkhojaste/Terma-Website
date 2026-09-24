import ProductsPage, { generateMetadata } from "@/features/products/components/products-page";

export const dynamic = "force-dynamic";
export { generateMetadata };

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ cmsPreview?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return <ProductsPage previewId={resolvedSearchParams?.cmsPreview} />;
}
