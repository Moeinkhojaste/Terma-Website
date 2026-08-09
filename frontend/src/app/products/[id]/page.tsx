import type { Metadata } from "next";
import ProductDetailPage, {
  generateMetadata as createMetadata,
  generateStaticParams as createStaticParams,
} from "@/features/products/components/product-detail-page";

type ProductPageProps = Parameters<typeof createMetadata>[0];

export function generateStaticParams() {
  return createStaticParams();
}

export function generateMetadata(props: ProductPageProps): Promise<Metadata> {
  return createMetadata(props);
}

export default ProductDetailPage;
