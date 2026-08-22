import type { Metadata } from "next";
import ProductDetailPage, {
  generateMetadata as createMetadata,
} from "@/features/products/components/product-detail-page";

export const dynamic = "force-dynamic";

type ProductPageProps = Parameters<typeof createMetadata>[0];

export function generateMetadata(props: ProductPageProps): Promise<Metadata> {
  return createMetadata(props);
}

export default ProductDetailPage;
