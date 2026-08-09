import Image from "next/image";
import { ArrowLeftIcon } from "@/components/icons";
import type { Product } from "@/data/products";
import Link from "next/link";

export function ProductCard({ product, unavailable = false }: { product: Product; unavailable?: boolean }) {
  return (
    <article className="product-card" id={`product-${product.id}`}>
      <div className="product-image-wrap">
        <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 767px) 92vw, (max-width: 1100px) 45vw, 31vw" className="product-image" />
      </div>
      <div className="product-card__body">
        <div className="product-meta">
          <span>{product.capacity}</span>
          <span className={unavailable ? "stock stock--off" : "stock"}>{unavailable ? "ناموجود" : product.stock}</span>
        </div>
        <h3>{product.name}</h3>
        <p className="product-description">{product.description}</p>
        <div className="product-card__footer">
          <strong>{product.price}</strong>
          {unavailable ? (
            <button className="card-action" type="button" disabled>ناموجود</button>
          ) : (
            <Link className="card-action" href="#راهنمای-خرید">بررسی اندازه <ArrowLeftIcon /></Link>
          )}
        </div>
      </div>
    </article>
  );
}
