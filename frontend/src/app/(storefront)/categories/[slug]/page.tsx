import { cache, Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ProductCatalog } from "@/features/products/components/product-catalog";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";
import { getCategory } from "@/features/products/product-api";
import { ApiError } from "@/lib/api-client";
import { getSiteUrl } from "@/lib/site-url";

type CategoryPageProps = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
const getCategoryForRequest = cache(getCategory);
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadCategory(identifier: string) {
  try {
    return await getCategoryForRequest(identifier);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) notFound();

  const category = await loadCategory(slug);
  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/categories/${encodeURIComponent(category.slug || category.id)}`;

  return {
    title: category.name,
    description: category.description || `مشاهده و خرید محصولات دسته‌بندی ${category.name} در فروشگاه ترما`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${category.name} | ترما`,
      description: category.description || `مشاهده و خرید محصولات دسته‌بندی ${category.name} در فروشگاه ترما`,
      url: canonicalUrl,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  if (!slug) notFound();

  const category = await loadCategory(slug);

  // If accessed via legacy GUID and has a slug, 308 redirect
  if (GUID_REGEX.test(slug) && category.slug && category.slug !== slug) {
    permanentRedirect(`/categories/${encodeURIComponent(category.slug)}`);
  }

  const siteUrl = getSiteUrl();

  const collectionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    description: category.description || `محصولات دسته ${category.name}`,
    url: `${siteUrl}/categories/${encodeURIComponent(category.slug || category.id)}`,
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
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${siteUrl}/categories/${encodeURIComponent(category.slug || category.id)}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      <main id="محتوا">
        <section className="catalog-hero">
          <Container>
            <nav className="breadcrumbs" aria-label="مسیر صفحه">
              <Link href="/">خانه</Link>
              <span>/</span>
              <Link href="/products">محصولات</Link>
              <span>/</span>
              <span aria-current="page">{category.name}</span>
            </nav>
            <div className="catalog-hero__header">
              <div>
                <p className="section-eyebrow">دسته‌بندی محصولات</p>
                <h1>{category.name}</h1>
              </div>
              {category.description && <p className="catalog-hero__desc">{category.description}</p>}
            </div>
          </Container>
        </section>
        <Suspense fallback={<ProductCatalogLoading />}>
          <ProductCatalog />
        </Suspense>
      </main>
    </>
  );
}
