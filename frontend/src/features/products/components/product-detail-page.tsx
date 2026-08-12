import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/features/products/components/product-card";
import { getProduct, listProducts } from "@/features/products/product-api";
import { ApiError } from "@/lib/api-client";

import { ProductCapacityDetails } from "@/features/products/components/product-capacity-details";

type ProductPageProps = { params: Promise<{ id: string }> };

const getProductForRequest = cache(getProduct);

async function loadProduct(id: string) {
  try {
    return await getProductForRequest(id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await loadProduct(id);
  return { title: `${product.name} | ترما`, description: product.description };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await loadProduct(id);
  const related = await listProducts({ categoryId: product.categoryId, pageSize: 4 });
  const relatedProducts = related.items.filter((item) => item.id !== product.id).slice(0, 3);

  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا">
        <Container>
          <nav className="breadcrumbs product-breadcrumbs" aria-label="مسیر صفحه">
            <Link href="/">خانه</Link><span>/</span><Link href="/products">محصولات</Link><span>/</span><span aria-current="page">{product.name}</span>
          </nav>
        </Container>

        <section className="product-detail section-pad">
          <Container className="product-detail__grid">
            <div className="product-summary">
              <div className="product-summary__topline">
                <span className={product.stockQuantity > 0 ? "stock" : "stock stock--off"}>{product.stock}</span>
                {product.hasDiscount && product.discountPercent && (
                  <span className="discount-badge">{new Intl.NumberFormat("fa-IR").format(product.discountPercent)}٪ تخفیف</span>
                )}
                <span>{product.categoryName}</span>
              </div>
              <h1>{product.name}</h1>
              <p>{product.longDescription}</p>

              <ProductCapacityDetails product={product} />
            </div>

            <div className="product-gallery">
              <div className="product-gallery__main">
                <Image src={product.image} alt={product.imageAlt} fill priority sizes="(max-width: 900px) 92vw, 54vw" />
              </div>
              <div className="product-gallery__secondary">
                <Image src={product.tableImage} alt={product.tableImageAlt} fill sizes="(max-width: 900px) 92vw, 54vw" />
              </div>
            </div>
          </Container>
        </section>

        <section className="product-information section-pad">
          <Container className="product-information__grid">
            <div><p className="section-eyebrow">رنگ و نقش</p><h2>جزئیات محصول</h2></div>
            <dl>
              <div><dt>ترکیب رنگ</dt><dd>{product.colors}</dd></div>
              <div><dt>طرح</dt><dd>{product.pattern}</dd></div>
              <div><dt>دسته‌بندی</dt><dd>{product.categoryName}</dd></div>
            </dl>
          </Container>
        </section>

        {relatedProducts.length > 0 && (
          <section className="related-products section-pad">
            <Container>
              <div className="catalog-toolbar"><h2>محصولات دیگر</h2><Link href="/products">مشاهده همه محصولات</Link></div>
              <div className="products-grid products-grid--related">
                {relatedProducts.map((item) => <ProductCard product={item} key={item.id} />)}
              </div>
            </Container>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
