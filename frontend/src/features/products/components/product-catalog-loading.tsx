import { Container } from "@/components/layout/container";

export function ProductCatalogLoading({ embedded = false }: { embedded?: boolean }) {
  const content = <><div className="catalog-loading-lines"><span /><span /></div><div className="products-grid products-grid--catalog catalog-skeletons">{Array.from({ length: 3 }, (_, index) => <div className="catalog-skeleton" key={index}><span /><span /><span /></div>)}</div></>;
  if (embedded) return <div className="catalog-loading" aria-busy="true" aria-label="در حال بارگذاری محصولات">{content}</div>;
  return <section className="catalog-section section-pad" aria-busy="true" aria-label="در حال بارگذاری محصولات"><Container>{content}</Container></section>;
}
