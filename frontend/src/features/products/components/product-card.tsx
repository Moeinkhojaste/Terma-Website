import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/ui/icons";
import type { Product } from "@/features/products/models";

export function ProductCard({ product, unavailable = false }: { product: Product; unavailable?: boolean }) {
  unavailable = unavailable || product.stockQuantity === 0;
  const content = (
    <>
      <div className="product-image-wrap">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, 31vw"
          className="product-image"
        />
      </div>
      <div className="product-card__body">
        <div className="product-meta">
          <span className={unavailable ? "stock stock--off" : "stock"}>
            {unavailable ? "ناموجود" : product.stock}
          </span>
        </div>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-card__footer">
          <strong>{product.price}</strong>
          {unavailable ? (
            <span className="card-action card-action--disabled">ناموجود</span>
          ) : (
            <span className="card-action">مشاهده محصول <ArrowLeftIcon /></span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <article className="product-card" id={`product-${product.id}`}>
      {unavailable ? (
        <div className="product-card__link product-card__link--disabled" aria-disabled="true">
          {content}
        </div>
      ) : (
        <Link
          className="product-card__link"
          href={`/products/${product.id}`}
          aria-label={`مشاهده ${product.name}`}
        >
          {content}
        </Link>
      )}
    </article>
  );
}
