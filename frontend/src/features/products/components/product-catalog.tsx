"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";
import { FilterIcon, XIcon } from "@/components/ui/icons";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";
import { RecentlyViewedProducts } from "@/features/products/components/recently-viewed-products";
import { getProductFacets, listCategories, listProducts } from "@/features/products/product-api";
import { recordRecentSearch } from "@/features/products/recently-viewed";
import type { CategoryDto, ProductFacets, ProductListQuery, ProductPage } from "@/features/products/models";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";

const PAGE_SIZE = 12;
type FilterDraft = { search: string; categoryId: string; minPrice: string; maxPrice: string; tableCapacity: string; color: string; inStock: string; sort: string };
const emptyDraft = (): FilterDraft => ({ search: "", categoryId: "", minPrice: "", maxPrice: "", tableCapacity: "", color: "", inStock: "", sort: "" });
const optionalNumber = (value: string | null) => value && Number.isFinite(Number(value)) ? Number(value) : undefined;
const positivePage = (value: string | null) => Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : 1;

function readDraft(parameters: URLSearchParams): FilterDraft {
  return { search: parameters.get("search") ?? "", categoryId: parameters.get("categoryId") ?? "", minPrice: parameters.get("minPrice") ?? "", maxPrice: parameters.get("maxPrice") ?? "", tableCapacity: parameters.get("tableCapacity") ?? "", color: parameters.get("color") ?? "", inStock: parameters.get("inStock") ?? "", sort: parameters.get("sort") ?? "" };
}
function readQuery(parameters: URLSearchParams): ProductListQuery {
  const draft = readDraft(parameters);
  return { search: draft.search || undefined, categoryId: draft.categoryId || undefined, minPrice: optionalNumber(draft.minPrice), maxPrice: optionalNumber(draft.maxPrice), tableCapacity: optionalNumber(draft.tableCapacity), color: draft.color || undefined, inStock: draft.inStock === "true" ? true : draft.inStock === "false" ? false : undefined, sort: draft.sort || undefined, page: positivePage(parameters.get("page")), pageSize: PAGE_SIZE };
}

function FilterFields({ draft, setDraft, categories, facets }: { draft: FilterDraft; setDraft: (updater: (current: FilterDraft) => FilterDraft) => void; categories: CategoryDto[]; facets?: ProductFacets }) {
  return <>
    <label className="catalog-filter catalog-filter--search"><span>جست‌وجو</span><input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="مثلاً ترمه آبی" /></label>
    <label className="catalog-filter"><span>مرتب‌سازی</span><select value={draft.sort} onChange={(event) => setDraft((current) => ({ ...current, sort: event.target.value }))}><option value="">جدیدترین (پیش‌فرض)</option><option value="price-asc">ارزان‌ترین</option><option value="price-desc">گران‌ترین</option><option value="name-asc">نام محصول (الف تا ی)</option></select></label>
    <label className="catalog-filter"><span>دسته‌بندی</span><select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))}><option value="">همه دسته‌ها</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
    <label className="catalog-filter"><span>رنگ</span><select value={draft.color} onChange={(event) => setDraft((current) => ({ ...current, color: event.target.value }))}><option value="">همه رنگ‌ها</option>{facets?.colors.map((color) => <option value={color} key={color}>{color}</option>)}</select></label>
    <label className="catalog-filter"><span>ظرفیت میز</span><select value={draft.tableCapacity} onChange={(event) => setDraft((current) => ({ ...current, tableCapacity: event.target.value }))}><option value="">همه ظرفیت‌ها</option>{facets?.tableCapacities.map((capacity) => <option value={capacity} key={capacity}>{new Intl.NumberFormat("fa-IR").format(capacity)} نفره</option>)}</select></label>
    <label className="catalog-filter"><span>موجودی</span><select value={draft.inStock} onChange={(event) => setDraft((current) => ({ ...current, inStock: event.target.value }))}><option value="">همه محصولات</option><option value="true">فقط موجود</option><option value="false">فقط ناموجود</option></select></label>
    <label className="catalog-filter"><span>حداقل قیمت</span><input type="number" min="0" inputMode="numeric" value={draft.minPrice} onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value }))} placeholder={facets?.minimumPrice ? new Intl.NumberFormat("fa-IR").format(facets.minimumPrice) : "تومان"} /></label>
    <label className="catalog-filter"><span>حداکثر قیمت</span><input type="number" min="0" inputMode="numeric" value={draft.maxPrice} onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value }))} placeholder={facets?.maximumPrice ? new Intl.NumberFormat("fa-IR").format(facets.maximumPrice) : "تومان"} /></label>
  </>;
}

function ErrorDetails({ error }: { error: unknown }) {
  const apiError = error instanceof ApiError ? error : undefined;
  return <><p>{getApiErrorMessage(error)}</p>{apiError?.problem?.errors && <ul>{Object.entries(apiError.problem.errors).flatMap(([field, messages]) => messages.map((message) => <li key={`${field}-${message}`}>{message}</li>))}</ul>}{apiError?.problem?.traceId && <small dir="ltr">Trace ID: {apiError.problem.traceId}</small>}</>;
}

export function ProductCatalog() {
  const router = useRouter(); const pathname = usePathname(); const searchParameters = useSearchParams();
  const queryKey = searchParameters.toString();
  const query = useMemo(() => readQuery(new URLSearchParams(queryKey)), [queryKey]);
  const [draft, setDraft] = useState(() => readDraft(new URLSearchParams(queryKey)));
  const [categories, setCategories] = useState<CategoryDto[]>([]); const [facets, setFacets] = useState<ProductFacets>();
  const [filterError, setFilterError] = useState(false); const [filterAttempt, setFilterAttempt] = useState(0);
  const [result, setResult] = useState<ProductPage>(); const [productError, setProductError] = useState<unknown>(); const [loading, setLoading] = useState(true); const [productAttempt, setProductAttempt] = useState(0); const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) setDraft(readDraft(new URLSearchParams(queryKey))); });
    return () => { active = false; };
  }, [queryKey]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listCategories(controller.signal), getProductFacets(controller.signal)]).then(([categoryItems, facetData]) => { setCategories(categoryItems); setFacets(facetData); setFilterError(false); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setFilterError(true); });
    return () => controller.abort();
  }, [filterAttempt]);
  useEffect(() => {
    const controller = new AbortController();
    listProducts(query, controller.signal).then((page) => { setResult(page); setProductError(undefined); }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setProductError(error); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, productAttempt]);

  const navigate = useCallback((nextDraft: FilterDraft, page = 1) => {
    const parameters = new URLSearchParams();
    for (const [key, value] of Object.entries(nextDraft)) if (value.trim()) parameters.set(key, value.trim());
    if (page > 1) parameters.set("page", String(page));
    const nextKey = parameters.toString(); if (nextKey === queryKey) { setFilterOpen(false); return; }
    if (nextDraft.search.trim()) recordRecentSearch(nextDraft.search);
    setLoading(true); setProductError(undefined); setFilterOpen(false); router.replace(`${pathname}${nextKey ? `?${nextKey}` : ""}`, { scroll: false });
  }, [pathname, queryKey, router]);
  const submit = (event: FormEvent) => { event.preventDefault(); navigate(draft); };
  const clear = () => { const next = emptyDraft(); setDraft(next); navigate(next); };
  const currentPage = result?.page ?? query.page ?? 1; const totalPages = result?.totalPages ?? 0;
  const activeCount = Object.values(readDraft(new URLSearchParams(queryKey))).filter(Boolean).length;

  const activeCategoryName = categories.find((c) => c.id === (query.categoryId || draft.categoryId))?.name;

  const removeFilter = (key: keyof FilterDraft) => {
    const next = { ...draft, [key]: "" };
    setDraft(next);
    navigate(next, 1);
  };

  const actions: ReactNode = (
    <div className="catalog-filter-actions">
      <button className="button button--primary" type="submit">اعمال فیلترها</button>
      <button className="button button--secondary" type="button" onClick={clear}>پاک‌کردن</button>
    </div>
  );

  return (
    <section className="catalog-section" id="همه">
      <Container>
        {/* Category Quick Chips Bar */}
        {categories.length > 0 && (
          <div className="catalog-category-chips" role="region" aria-label="انتخاب سریع دسته‌بندی">
            <button
              type="button"
              className={`category-chip ${!draft.categoryId ? "category-chip--active" : ""}`}
              onClick={() => {
                const next = { ...draft, categoryId: "" };
                setDraft(next);
                navigate(next, 1);
              }}
            >
              همه محصولات
            </button>
            {categories.map((category) => (
              <button
                type="button"
                key={category.id}
                className={`category-chip ${draft.categoryId === category.id ? "category-chip--active" : ""}`}
                onClick={() => {
                  const next = { ...draft, categoryId: category.id };
                  setDraft(next);
                  navigate(next, 1);
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="catalog-top-actions">
          <button className="mobile-filter-button button button--secondary" type="button" onClick={() => setFilterOpen(true)}>
            <FilterIcon /> فیلتر و مرتب‌سازی {activeCount > 0 && <span>{new Intl.NumberFormat("fa-IR").format(activeCount)}</span>}
          </button>
          <label className="catalog-sort-select catalog-sort-select--mobile">
            <span>مرتب‌سازی:</span>
            <select
              aria-label="مرتب‌سازی سریع محصولات"
              value={draft.sort}
              onChange={(event) => {
                const next = { ...draft, sort: event.target.value };
                setDraft(next);
                navigate(next, 1);
              }}
            >
              <option value="">جدیدترین</option>
              <option value="price-asc">ارزان‌ترین</option>
              <option value="price-desc">گران‌ترین</option>
              <option value="name-asc">نام (الف تا ی)</option>
            </select>
          </label>
        </div>

        <AccessibleDialog open={filterOpen} onClose={() => setFilterOpen(false)} className="filter-dialog sheet-dialog" label="فیلتر و مرتب‌سازی محصولات">
          <form className="filter-sheet" onSubmit={submit}>
            <div className="filter-sheet__heading">
              <h2>فیلتر و مرتب‌سازی</h2>
              <button className="dialog-close" type="button" onClick={() => setFilterOpen(false)} aria-label="بستن فیلترها"><XIcon /></button>
            </div>
            <div className="filter-sheet__body">
              <FilterFields draft={draft} setDraft={setDraft} categories={categories} facets={facets} />
            </div>
            {actions}
          </form>
        </AccessibleDialog>

        {filterError && (
          <div className="catalog-inline-warning" role="alert">
            <span>گزینه‌های فیلتر بارگذاری نشدند.</span>
            <button type="button" onClick={() => setFilterAttempt((value) => value + 1)}>تلاش دوباره</button>
          </div>
        )}

        <div className="catalog-layout">
          {/* Desktop Filter Sidebar */}
          <aside className="catalog-sidebar">
            <form className="catalog-filters catalog-filters--desktop" onSubmit={submit} aria-label="فیلتر محصولات">
              <div className="catalog-sidebar__header">
                <span className="catalog-sidebar__title"><FilterIcon /> فیلترهای پیشرفته</span>
                {activeCount > 0 && (
                  <button type="button" className="catalog-sidebar__clear" onClick={clear}>
                    پاک‌کردن
                  </button>
                )}
              </div>
              <FilterFields draft={draft} setDraft={setDraft} categories={categories} facets={facets} />
              {actions}
            </form>
          </aside>

          {/* Main Products Area */}
          <div className="catalog-main">
            {/* Active filter chips */}
            {activeCount > 0 && (
              <div className="catalog-active-filters" aria-label="فیلترهای فعال">
                <span className="catalog-active-filters__label">فیلترهای فعال:</span>
                {draft.search && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("search")}>
                    جست‌وجو: «{draft.search}» <XIcon />
                  </button>
                )}
                {activeCategoryName && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("categoryId")}>
                    دسته: {activeCategoryName} <XIcon />
                  </button>
                )}
                {draft.color && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("color")}>
                    رنگ: {draft.color} <XIcon />
                  </button>
                )}
                {draft.tableCapacity && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("tableCapacity")}>
                    ظرفیت: {new Intl.NumberFormat("fa-IR").format(Number(draft.tableCapacity))} نفره <XIcon />
                  </button>
                )}
                {draft.inStock && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("inStock")}>
                    {draft.inStock === "true" ? "فقط کالاهای موجود" : "فقط کالاهای ناموجود"} <XIcon />
                  </button>
                )}
                {draft.minPrice && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("minPrice")}>
                    حداقل قیمت: {new Intl.NumberFormat("fa-IR").format(Number(draft.minPrice))} <XIcon />
                  </button>
                )}
                {draft.maxPrice && (
                  <button type="button" className="active-filter-badge" onClick={() => removeFilter("maxPrice")}>
                    حداکثر قیمت: {new Intl.NumberFormat("fa-IR").format(Number(draft.maxPrice))} <XIcon />
                  </button>
                )}
                <button type="button" className="active-filter-clear-all" onClick={clear}>
                  پاک‌کردن همه
                </button>
              </div>
            )}

            {loading ? (
              <div aria-live="polite"><ProductCatalogLoading embedded /></div>
            ) : productError ? (
              <div className="catalog-error" role="alert">
                <h2>محصولات بارگذاری نشدند</h2>
                <ErrorDetails error={productError} />
                <button className="button button--secondary" type="button" onClick={() => { setLoading(true); setProductAttempt((value) => value + 1); }}>تلاش دوباره</button>
              </div>
            ) : result && result.items.length === 0 ? (
              <>
                <div className="catalog-empty">
                  <span>۰</span>
                  <h2>محصولی با این مشخصات پیدا نشد</h2>
                  <p>یک عبارت کوتاه‌تر امتحان کنید یا بعضی فیلترها را بردارید.</p>
                  <button className="button button--secondary" type="button" onClick={clear}>پاک‌کردن همه فیلترها</button>
                </div>
                <RecentlyViewedProducts title="شاید یکی از این محصولات را می‌خواستید" compact />
              </>
            ) : result ? (
              <>
                <div className="catalog-toolbar">
                  <div className="catalog-toolbar__info">
                    <h2>محصولات</h2>
                    <span className="catalog-toolbar__count">{new Intl.NumberFormat("fa-IR").format(result.totalCount)} محصول</span>
                  </div>
                  <label className="catalog-sort-select catalog-sort-select--desktop">
                    <span>مرتب‌سازی:</span>
                    <select
                      aria-label="مرتب‌سازی محصولات"
                      value={draft.sort}
                      onChange={(event) => {
                        const next = { ...draft, sort: event.target.value };
                        setDraft(next);
                        navigate(next, 1);
                      }}
                    >
                      <option value="">جدیدترین</option>
                      <option value="price-asc">ارزان‌ترین</option>
                      <option value="price-desc">گران‌ترین</option>
                      <option value="name-asc">نام (الف تا ی)</option>
                    </select>
                  </label>
                </div>

                <div className="products-grid products-grid--catalog">
                  {result.items.map((product) => <ProductCard product={product} key={product.id} />)}
                </div>

                {totalPages > 1 && (
                  <nav className="catalog-pagination" aria-label="صفحه‌بندی محصولات">
                    <button type="button" disabled={currentPage <= 1} onClick={() => navigate(readDraft(new URLSearchParams(queryKey)), currentPage - 1)}>صفحه قبل</button>
                    <span>صفحه {new Intl.NumberFormat("fa-IR").format(currentPage)} از {new Intl.NumberFormat("fa-IR").format(totalPages)}</span>
                    <button type="button" disabled={currentPage >= totalPages} onClick={() => navigate(readDraft(new URLSearchParams(queryKey)), currentPage + 1)}>صفحه بعد</button>
                  </nav>
                )}
              </>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
