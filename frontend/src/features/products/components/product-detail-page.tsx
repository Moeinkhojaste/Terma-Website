import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ProductDetailExperience } from "@/features/products/components/product-detail-experience";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";
import { getProduct } from "@/features/products/product-api";
import { ApiError } from "@/lib/api-client";

type ProductPageProps = { params: Promise<{ id: string }> };
const getProductForRequest = cache(getProduct);

async function loadProduct(id: string) {
  try { return await getProductForRequest(id); }
  catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  return { title: `${product.name} | ترما`, description: product.description };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await loadProduct(id);
  return <>
    <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a><Header />
    <main id="محتوا" className="product-page">
      <Container><nav className="breadcrumbs product-breadcrumbs" aria-label="مسیر صفحه"><Link href="/">خانه</Link><span>/</span><Link href="/products">محصولات</Link><span>/</span><span aria-current="page">{product.name}</span></nav></Container>
      <ProductDetailExperience product={product} />
      <Container className="section-pad"><RecentlyViewedProducts currentProductId={product.id} /></Container>
    </main><Footer />
  </>;
}
