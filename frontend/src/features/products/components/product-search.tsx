"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { listProducts } from "@/features/products/product-api";
import { readRecentSearches, recordRecentSearch } from "@/features/products/recently-viewed";
import type { Product } from "@/features/products/models";

export function ProductSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      listProducts({ search: query.trim(), pageSize: 6 }, controller.signal)
        .then((page) => { setResults(page.items); setActiveIndex(-1); })
        .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query]);

  const goToSearch = (value = query) => {
    const clean = value.trim();
    if (!clean) return;
    recordRecentSearch(clean);
    setOpen(false);
    router.push(`/products?search=${encodeURIComponent(clean)}`);
  };
  const openProduct = (product: Product) => { setOpen(false); router.push(`/products/${encodeURIComponent(product.slug || product.id)}`); };
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length) { event.preventDefault(); setActiveIndex((value) => Math.min(results.length - 1, value + 1)); }
    if (event.key === "ArrowUp" && results.length) { event.preventDefault(); setActiveIndex((value) => Math.max(-1, value - 1)); }
    if (event.key === "Enter" && activeIndex >= 0) { event.preventDefault(); openProduct(results[activeIndex]); }
  };

  return <>
    <button className="icon-button header-search-button" type="button" onClick={() => { setRecent(readRecentSearches()); setOpen(true); }} aria-label="جست‌وجوی محصولات"><SearchIcon /></button>
    <AccessibleDialog open={open} onClose={() => setOpen(false)} className="search-dialog sheet-dialog" label="جست‌وجوی محصولات">
      <div className="search-panel">
        <div className="search-panel__heading"><div><p className="section-eyebrow">جست‌وجوی سریع</p><h2>چه سفره‌ای می‌خواهید؟</h2></div><button className="dialog-close" type="button" onClick={() => setOpen(false)} aria-label="بستن جست‌وجو"><XIcon /></button></div>
        <form className="search-form" onSubmit={(event: FormEvent) => { event.preventDefault(); goToSearch(); }} role="search">
          <SearchIcon /><input autoFocus value={query} onChange={(event) => { const next = event.target.value; setQuery(next); if (next.trim().length < 2) { setResults([]); setLoading(false); setActiveIndex(-1); } }} onKeyDown={handleKeyDown} placeholder="مثلاً ترمه آبی یا سفره زیر دو میلیون" aria-label="عبارت جست‌وجو" aria-controls="search-suggestions" aria-activedescendant={activeIndex >= 0 ? `search-result-${results[activeIndex]?.id}` : undefined} /><button className="button button--primary" type="submit">جست‌وجو</button>
        </form>
        <div id="search-suggestions" className="search-suggestions" role="listbox">
          {loading && <p role="status">در حال جست‌وجو…</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && <div className="search-no-results"><strong>نتیجه‌ای پیدا نشد</strong><span>عبارت کوتاه‌تر، رنگ یا ظرفیت میز را امتحان کنید.</span><button type="button" onClick={() => goToSearch()}>مشاهده صفحه جست‌وجو و فیلترها</button></div>}
          {results.map((product, index) => <button id={`search-result-${product.id}`} type="button" role="option" aria-selected={index === activeIndex} className={index === activeIndex ? "is-active" : ""} onMouseEnter={() => setActiveIndex(index)} onClick={() => openProduct(product)} key={product.id}><span className="search-result__image"><Image src={product.image} alt="" fill sizes="64px" /></span><span><strong>{product.name}</strong><small>{product.capacity} · {product.stock}</small></span><b>{product.price}</b></button>)}
        </div>
        {query.length < 2 && recent.length > 0 && <div className="recent-searches"><strong>جست‌وجوهای اخیر</strong><div>{recent.map((item) => <button type="button" onClick={() => { setQuery(item); goToSearch(item); }} key={item}>{item}</button>)}</div></div>}
      </div>
    </AccessibleDialog>
  </>;
}
