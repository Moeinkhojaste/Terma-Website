import { apiRequest } from "@/lib/api-client";
import { mapProduct, mapProductPage } from "@/features/products/product-mapper";
import type {
  CategoryDto,
  PagedResponse,
  Product,
  ProductDto,
  ProductFacets,
  ProductListQuery,
  ProductPage,
} from "@/features/products/models";

function createProductQuery(query: ProductListQuery) {
  const parameters = new URLSearchParams();
  if (query.categoryId) parameters.set("categoryId", query.categoryId);
  if (query.minPrice !== undefined) parameters.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) parameters.set("maxPrice", String(query.maxPrice));
  if (query.tableCapacity !== undefined) parameters.set("tableCapacity", String(query.tableCapacity));
  if (query.color?.trim()) parameters.set("color", query.color.trim());
  if (query.inStock !== undefined) parameters.set("inStock", String(query.inStock));
  if (query.search?.trim()) parameters.set("search", query.search.trim());
  if (query.sort?.trim()) parameters.set("sort", query.sort.trim());
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
  const safeId = encodeURIComponent(decodeURIComponent(id));
  const response = await apiRequest<ProductDto>(`/api/products/${safeId}`, {
    signal,
    cache: "no-store",
  });
  return mapProduct(response);
}

export function listCategories(signal?: AbortSignal) {
  return apiRequest<CategoryDto[]>("/api/categories", { signal, cache: "no-store" });
}

export function getCategory(identifier: string, signal?: AbortSignal) {
  const safeId = encodeURIComponent(decodeURIComponent(identifier));
  return apiRequest<CategoryDto>(`/api/categories/${safeId}`, { signal, cache: "no-store" });
}

export function getProductFacets(signal?: AbortSignal) {
  return apiRequest<ProductFacets>("/api/products/facets", { signal, cache: "no-store" });
}

export async function lookupProducts(ids: string[], signal?: AbortSignal) {
  const parameters = new URLSearchParams();
  ids.slice(0, 8).forEach((id) => parameters.append("ids", id));
  if (ids.length === 0) return [];
  const response = await apiRequest<ProductDto[]>(`/api/products/lookup?${parameters}`, { signal, cache: "no-store" });
  return response.map(mapProduct);
}

export async function getRecommendations(productId: string, variantId?: string, limit = 4, signal?: AbortSignal) {
  const parameters = new URLSearchParams({ limit: String(limit) });
  if (variantId) parameters.set("variantId", variantId);
  const response = await apiRequest<ProductDto[]>(
    `/api/products/${encodeURIComponent(productId)}/recommendations?${parameters}`,
    { signal, cache: "no-store" },
  );
  return response.map(mapProduct);
}

export type PublicPackagingSettings = {
  giftPackagingPrice: number;
  isGiftPackagingEnabled: boolean;
};

export function getStorePackagingSettings(signal?: AbortSignal) {
  return apiRequest<PublicPackagingSettings>("/api/store/packaging", { signal, cache: "no-store" });
}
