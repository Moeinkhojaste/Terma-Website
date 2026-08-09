"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductCatalogLoading } from "@/features/products/components/product-catalog-loading";
import { listCategories, listProducts } from "@/features/products/product-api";
import type { CategoryDto, ProductListQuery, ProductPage } from "@/features/products/models";
import { ApiError, getApiErrorMessage } from "@/lib/api-client";

const PAGE_SIZE = 12;

type FilterDraft = {
  search: string;
  categoryId: string;
  minPrice: string;
  maxPrice: string;
  tableCapacity: string;
};

function optionalNumber(value: string | null) {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positivePage(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readDraft(parameters: URLSearchParams): FilterDraft {
  return {
    search: parameters.get("search") ?? "",
    categoryId: parameters.get("categoryId") ?? "",
    minPrice: parameters.get("minPrice") ?? "",
    maxPrice: parameters.get("maxPrice") ?? "",
    tableCapacity: parameters.get("tableCapacity") ?? "",
  };
}

function readQuery(parameters: URLSearchParams): ProductListQuery {
  return {
    ...readDraft(parameters),
    minPrice: optionalNumber(parameters.get("minPrice")),
    maxPrice: optionalNumber(parameters.get("maxPrice")),
    tableCapacity: optionalNumber(parameters.get("tableCapacity")),
    categoryId: parameters.get("categoryId") || undefined,
    search: parameters.get("search") || undefined,
    page: positivePage(parameters.get("page")),
    pageSize: PAGE_SIZE,
  };
}

function ErrorDetails({ error }: { error: unknown }) {
  const apiError = error instanceof ApiError ? error : undefined;
  const fieldErrors = apiError?.problem?.errors;
  return (
    <>
      <p>{getApiErrorMessage(error)}</p>
      {fieldErrors && Object.entries(fieldErrors).length > 0 && (
        <ul>{Object.entries(fieldErrors).flatMap(([field, messages]) => messages.map((message) => <li key={`${field}-${message}`}>{message}</li>))}</ul>
      )}
      {apiError?.problem?.traceId && <small dir="ltr">Trace ID: {apiError.problem.traceId}</small>}
    </>
  );
}

export function ProductCatalog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParameters = useSearchParams();
  const queryKey = searchParameters.toString();
  const query = useMemo(() => readQuery(new URLSearchParams(queryKey)), [queryKey]);
  const [draft, setDraft] = useState(() => readDraft(new URLSearchParams(queryKey)));
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryError, setCategoryError] = useState<unknown>();
  const [categoryAttempt, setCategoryAttempt] = useState(0);
  const [result, setResult] = useState<ProductPage>();
  const [productError, setProductError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const [productAttempt, setProductAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listCategories(controller.signal)
      .then((items) => {
        setCategories(items);
        setCategoryError(undefined);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setCategoryError(error);
      });
    return () => controller.abort();
  }, [categoryAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    listProducts(query, controller.signal)
      .then((page) => {
        setResult(page);
        setProductError(undefined);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setProductError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [query, productAttempt]);

  const navigate = useCallback((nextDraft: FilterDraft, page = 1) => {
    const parameters = new URLSearchParams();
    if (nextDraft.search.trim()) parameters.set("search", nextDraft.search.trim());
    if (nextDraft.categoryId) parameters.set("categoryId", nextDraft.categoryId);
    if (nextDraft.minPrice) parameters.set("minPrice", nextDraft.minPrice);
    if (nextDraft.maxPrice) parameters.set("maxPrice", nextDraft.maxPrice);
    if (nextDraft.tableCapacity) parameters.set("tableCapacity", nextDraft.tableCapacity);
    if (page > 1) parameters.set("page", String(page));
    const nextQueryKey = parameters.toString();

    if (nextQueryKey === queryKey) return;

    setLoading(true);
    setProductError(undefined);
    router.replace(`${pathname}${nextQueryKey ? `?${nextQueryKey}` : ""}`, { scroll: false });
  }, [pathname, queryKey, router]);

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate(draft);
  }

  const currentPage = result?.page ?? query.page ?? 1;
  const totalPages = result?.totalPages ?? 0;

  return (
    <section className="catalog-section section-pad" id="همه">
      <Container>
        <form className="catalog-filters" id="دسته‌بندی" onSubmit={submitFilters} aria-label="فیلتر محصولات">
          <label className="catalog-filter catalog-filter--search">
            <span>جست‌وجو</span>
            <input value={draft.search} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="نام یا کد محصول" />
          </label>
          <label className="catalog-filter">
            <span>دسته‌بندی</span>
            <select value={draft.categoryId} onChange={(event) => setDraft((current) => ({ ...current, categoryId: event.target.value }))} disabled={Boolean(categoryError)}>
              <option value="">همه دسته‌ها</option>
              {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="catalog-filter">
            <span>حداقل قیمت</span>
            <input type="number" min="0" inputMode="numeric" value={draft.minPrice} onChange={(event) => setDraft((current) => ({ ...current, minPrice: event.target.value }))} placeholder="تومان" />
          </label>
          <label className="catalog-filter">
            <span>حداکثر قیمت</span>
            <input type="number" min="0" inputMode="numeric" value={draft.maxPrice} onChange={(event) => setDraft((current) => ({ ...current, maxPrice: event.target.value }))} placeholder="تومان" />
          </label>
          <label className="catalog-filter">
            <span>ظرفیت میز</span>
            <input type="number" min="1" inputMode="numeric" value={draft.tableCapacity} onChange={(event) => setDraft((current) => ({ ...current, tableCapacity: event.target.value }))} placeholder="تعداد نفر" />
          </label>
          <div className="catalog-filter-actions">
            <button className="button button--primary" type="submit">اعمال فیلترها</button>
            <button className="button button--secondary" type="button" onClick={() => { const empty = readDraft(new URLSearchParams()); setDraft(empty); navigate(empty); }}>پاک‌کردن</button>
          </div>
        </form>

        {Boolean(categoryError) && (
          <div className="catalog-inline-warning" role="alert">
            <span>دسته‌بندی‌ها بارگذاری نشدند.</span>
            <button type="button" onClick={() => { setCategoryError(undefined); setCategoryAttempt((value) => value + 1); }}>تلاش دوباره</button>
          </div>
        )}

        {loading ? (
          <div aria-live="polite"><ProductCatalogLoading embedded /></div>
        ) : productError ? (
          <div className="catalog-error" role="alert">
            <h2>محصولات بارگذاری نشدند</h2>
            <ErrorDetails error={productError} />
            <button className="button button--secondary" type="button" onClick={() => { setLoading(true); setProductError(undefined); setProductAttempt((value) => value + 1); }}>تلاش دوباره</button>
          </div>
        ) : result && result.items.length === 0 ? (
          <div className="catalog-empty">
            <span>۰</span>
            <h2>محصولی پیدا نشد</h2>
            <p>فیلترها را تغییر دهید و دوباره بررسی کنید.</p>
            <button className="button button--secondary" type="button" onClick={() => { const empty = readDraft(new URLSearchParams()); setDraft(empty); navigate(empty); }}>پاک‌کردن فیلترها</button>
          </div>
        ) : result ? (
          <>
            <div className="catalog-toolbar"><h2>محصولات موجود</h2><span>{new Intl.NumberFormat("fa-IR").format(result.totalCount)} محصول</span></div>
            <div className="products-grid products-grid--catalog">
              {result.items.map((product) => <div key={product.id}><ProductCard product={product} /></div>)}
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
      </Container>
    </section>
  );
}
