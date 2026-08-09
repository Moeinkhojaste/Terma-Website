import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { Container } from "@/components/layout/container";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { ProductCard } from "@/features/products/components/product-card";
import { getProduct, products } from "@/features/products/data/products";

const capacityOptions = [4, 6, 8] as const;
const persianCapacity = { 4: "۴ نفره", 6: "۶ نفره", 8: "۸ نفره" };

type ProductPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = getProduct(id);
  return product
    ? { title: `${product.name} | ترما`, description: product.description }
    : { title: "محصول پیدا نشد | ترما" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  const relatedProducts = products.filter((item) => item.id !== product.id);

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
              <div className="product-summary__topline"><span className={product.stockQuantity > 0 ? "stock" : "stock stock--off"}>{product.stockQuantity > 0 ? product.stock : "ناموجود"}</span></div>
              <h1>{product.name}</h1>
              <p>{product.longDescription}</p>
              <strong className="product-detail__price">{product.price}</strong>

              <fieldset className="capacity-selector">
                <legend>انتخاب ظرفیت</legend>
                <div className="capacity-options">
                  {capacityOptions.map((option) => {
                    const available = option === product.size && product.stockQuantity > 0;
                    return (
                      <button
                        className={available ? "capacity-option capacity-option--selected" : "capacity-option capacity-option--unavailable"}
                        type="button"
                        disabled={!available}
                        aria-pressed={available}
                        key={option}
                      >
                        <strong>{persianCapacity[option]}</strong>
                        <span>{available ? "انتخاب‌شده" : "ناموجود"}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <dl className="product-quick-specs">
                <div><dt>ابعاد فعلی</dt><dd>{product.dimensions}</dd></div>
                <div><dt>رویه</dt><dd>پارچه ترمه</dd></div>
                <div><dt>آستر</dt><dd>{product.lining}</dd></div>
                <div><dt>کد محصول</dt><dd dir="ltr">{product.sku}</dd></div>
              </dl>

              <AddToCartButton productId={product.id} />
            </div>

            <div className="product-gallery">
              <div className="product-gallery__main">
                <Image src={product.image} alt={product.imageAlt} fill priority sizes="(max-width: 900px) 92vw, 54vw" />
              </div>
              <div className="product-gallery__secondary">
                <Image src={product.tableImage} alt={`نمای کامل ${product.name} در چیدمان نمونه`} fill sizes="(max-width: 900px) 92vw, 54vw" />
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
              <div><dt>لبه‌دوزی</dt><dd>نوار کرم‌طلایی در چهار طرف محصول</dd></div>
              <div><dt>نگهداری</dt><dd>شست‌وشوی دستی با آب سرد، شوینده ملایم و خشک‌کردن به‌صورت صاف</dd></div>
            </dl>
          </Container>
        </section>

        <section className="related-products section-pad">
          <Container>
            <div className="catalog-toolbar"><h2>محصولات دیگر</h2><Link href="/products">مشاهده همه محصولات</Link></div>
            <div className="products-grid products-grid--related">
              {relatedProducts.map((item) => <ProductCard product={item} key={item.id} />)}
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </>
  );
}
