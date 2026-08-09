export type ProductDto = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  price: number;
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

export type Product = {
  id: string;
  name: string;
  size: number;
  capacity: string;
  dimensions: string;
  price: string;
  priceValue: number;
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
  description: string;
  longDescription: string;
  categoryId: string;
  categoryName: string;
  isActive: boolean;
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
