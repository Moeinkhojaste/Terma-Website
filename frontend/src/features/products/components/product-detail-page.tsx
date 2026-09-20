import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ProductDetailExperience } from "@/features/products/components/product-detail-experience";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";
import { getProduct } from "@/features/products/product-api";
import { ApiError } from "@/lib/api-client";
import { getSiteUrl } from "@/lib/site-url";

type ProductPageProps = { params: Promise<{ id?: string; slug?: string }> };
const getProductForRequest = cache(getProduct);
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProduct(identifier: string) {
  try {
    return await getProductForRequest(identifier);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id, slug } = await params;
  const identifier = slug || id;
  if (!identifier) notFound();

  const product = await loadProduct(identifier);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/products/${encodeURIComponent(product.slug)}`;

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} | ترما`,
      description: product.description,
      url: canonicalUrl,
      images: product.media.length > 0 ? [{ url: product.media[0].src, alt: product.media[0].alt }] : [],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id, slug } = await params;
  const identifier = slug || id;
  if (!identifier) notFound();

  const product = await loadProduct(identifier);

  // If accessed via legacy GUID and the product has a slug, 308 redirect to canonical slug
  if (GUID_REGEX.test(identifier) && product.slug && product.slug !== identifier) {
    permanentRedirect(`/products/${encodeURIComponent(product.slug)}`);
  }

  const siteUrl = getSiteUrl();

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.media.map((m) => m.src),
    sku: product.sku,
    category: product.categoryName,
    brand: {
      "@type": "Brand",
      name: "ترما",
    },
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${encodeURIComponent(product.slug)}`,
      priceCurrency: "IRR",
      price: product.priceValue * 10,
      itemCondition: "https://schema.org/NewCondition",
      availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "خانه",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "محصولات",
        item: `${siteUrl}/products`,
      },
      ...(product.categoryName
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: product.categoryName,
              item: `${siteUrl}/categories/${encodeURIComponent(product.categorySlug || product.categoryId)}`,
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: product.categoryName ? 4 : 3,
        name: product.name,
        item: `${siteUrl}/products/${encodeURIComponent(product.slug)}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <main id="محتوا" className="product-page">
        <Container>
          <nav className="breadcrumbs product-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link>
            <span>/</span>
            <Link href="/products">محصولات</Link>
            {product.categoryName && (
              <>
                <span>/</span>
                <Link href={`/categories/${encodeURIComponent(product.categorySlug || product.categoryId)}`}>
                  {product.categoryName}
                </Link>
              </>
            )}
            <span>/</span>
            <span aria-current="page">{product.name}</span>
          </nav>
        </Container>
        <ProductDetailExperience product={product} />
        <Container className="section-pad">
          <RecentlyViewedProducts currentProductId={product.id} />
        </Container>
      </main>
    </>
  );
}
