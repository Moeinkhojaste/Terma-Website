export type ProductVariantDto = {
  id: string;
  productId: string;
  title: string;
  sku: string;
  color: string;
  tableCapacity: number;
  length: number;
  width: number;
  price: number;
  compareAtPrice?: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type ProductDto = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  stockQuantity: number;
  tableCapacity: number;
  length: number;
  width: number;
  fabricType: string;
  liningType: string;
  color: string;
  pattern: string;
  isActive: boolean;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  updatedAt: string | null;
  variants?: ProductVariantDto[] | null;
};

export type CategoryDto = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type ProductCapacityOption = {
  id?: string;
  tableCapacity: number;
  capacityLabel: string;
  length: number;
  width: number;
  dimensions: string;
  price: string;
  priceValue: number;
  compareAtPrice?: string | null;
  compareAtPriceValue?: number | null;
  discountPercent?: number | null;
  hasDiscount?: boolean;
  stockQuantity: number;
  isAvailable: boolean;
  sku: string;
};

export type Product = {
  id: string;
  name: string;
  size: number;
  capacity: string;
  dimensions: string;
  price: string;
  priceValue: number;
  compareAtPrice?: string | null;
  compareAtPriceValue?: number | null;
  discountPercent?: number | null;
  hasDiscount: boolean;
  stockQuantity: number;
  stock: string;
  sku: string;
  fabricType: string;
  lining: string;
  colors: string;
  pattern: string;
  image: string;
  tableImage: string;
  imageAlt: string;
  tableImageAlt: string;
  description: string;
  longDescription: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
  capacities: ProductCapacityOption[];
};

export type ProductListQuery = {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tableCapacity?: number;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ProductPage = Omit<PagedResponse<ProductDto>, "items"> & {
  items: Product[];
};
