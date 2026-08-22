import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ProductCatalog } from "@/features/products/components/product-catalog";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";

export const metadata: Metadata = {
  title: "محصولات | ترما",
  description: "مشاهده و فیلتر محصولات ترما بر اساس دسته‌بندی، قیمت و ظرفیت.",
};

export default function ProductsPage() {
  return (
    <>
      <a className="skip-link" href="#محتوا">رفتن به محتوای اصلی</a>
      <Header />
      <main id="محتوا">
        <section className="catalog-hero">
          <Container>
            <nav className="breadcrumbs" aria-label="مسیر صفحه">
              <Link href="/">خانه</Link><span>/</span><span aria-current="page">محصولات</span>
            </nav>
            <div className="catalog-hero__header">
              <div>
                <p className="section-eyebrow">مجموعه اصیل ترما</p>
                <h1>همه محصولات</h1>
              </div>
            </div>
          </Container>
        </section>
        <Suspense fallback={<ProductCatalogLoading />}>
          <ProductCatalog />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
