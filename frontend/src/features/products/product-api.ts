import { apiRequest } from "@/lib/api-client";
import { mapProduct, mapProductPage } from "@/features/products/product-mapper";
import type {
  CategoryDto,
  PagedResponse,
  Product,
  ProductDto,
  ProductListQuery,
  ProductPage,
} from "@/features/products/models";

function createProductQuery(query: ProductListQuery) {
  const parameters = new URLSearchParams();
  if (query.categoryId) parameters.set("categoryId", query.categoryId);
  if (query.minPrice !== undefined) parameters.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) parameters.set("maxPrice", String(query.maxPrice));
  if (query.tableCapacity !== undefined) parameters.set("tableCapacity", String(query.tableCapacity));
  if (query.search?.trim()) parameters.set("search", query.search.trim());
  if (query.page !== undefined) parameters.set("page", String(query.page));
  if (query.pageSize !== undefined) parameters.set("pageSize", String(query.pageSize));
  return parameters.toString();
}

export async function listProducts(query: ProductListQuery = {}, signal?: AbortSignal): Promise<ProductPage> {
  const queryString = createProductQuery(query);
  const response = await apiRequest<PagedResponse<ProductDto>>(
    `/api/products${queryString ? `?${queryString}` : ""}`,
    { signal, cache: "no-store" },
  );
  return mapProductPage(response);
}

export async function getProduct(id: string, signal?: AbortSignal): Promise<Product> {
  const response = await apiRequest<ProductDto>(`/api/products/${encodeURIComponent(id)}`, {
    signal,
    cache: "no-store",
  });
  return mapProduct(response);
}

export function listCategories(signal?: AbortSignal) {
  return apiRequest<CategoryDto[]>("/api/categories", { signal, cache: "no-store" });
}
