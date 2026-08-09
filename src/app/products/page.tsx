import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { ProductCard } from "@/components/product-card";
import { products } from "@/data/products";

export const metadata: Metadata = {
  title: "محصولات | ترما",
  description: "مشاهده سفره‌های ترمه نیلا، لاجورد و فیروزه در دسته‌های ظرفیت مختلف.",
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
            <p className="section-eyebrow">مجموعه فعلی ترما</p>
            <h1>همه محصولات</h1>
            <p>محصولات فعلی ترما را بر اساس نقش یا ظرفیت بررسی کنید. با اضافه‌شدن مدل‌های جدید، این صفحه کامل‌تر خواهد شد.</p>
            <nav className="capacity-filters" id="دسته‌بندی" aria-label="دسته‌بندی محصولات بر اساس ظرفیت">
              <Link href="#همه">همه</Link>
              <Link href="#size-4">۴ نفره</Link>
              <Link href="#size-6">۶ نفره</Link>
              <Link href="#size-8">۸ نفره</Link>
            </nav>
          </Container>
        </section>
        <section className="catalog-section section-pad" id="همه">
          <Container>
            <div className="catalog-toolbar"><h2>محصولات موجود</h2><span>{products.length} محصول</span></div>
            <div className="products-grid products-grid--catalog">
              {products.map((product) => (
                <div id={`size-${product.size}`} key={product.id}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
