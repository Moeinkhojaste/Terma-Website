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
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
};

export type ProductDto = {
  id: string;
  name: string;
  slug?: string;
  sku: string;
  description: string | null;
  detailedDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  discountPercent?: number | null;
  stockQuantity?: number;
  availableQuantity?: number;
  tableCapacity: number;
  length: number;
  width: number;
  fabricType: string;
  liningType: string;
  color: string;
  pattern: string;
  isActive?: boolean;
  categoryId: string;
  categoryName: string;
  categorySlug?: string;
  createdAt?: string;
  updatedAt?: string | null;
  variants?: ProductVariantDto[] | null;
  media?: ProductMediaDto[] | null;
};

export type ProductMediaKind = "full" | "table" | "folded" | "texture" | "stitching" | "lining" | "other";

export type ProductMediaDto = {
  id: string;
  productId: string;
  publicUrl: string;
  altText: string;
  kind: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type ProductMedia = {
  id: string;
  src: string;
  alt: string;
  kind: ProductMediaKind;
  sortOrder: number;
  isPrimary: boolean;
};

export type CategoryDto = {
  id: string;
  name: string;
  slug?: string;
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
  slug: string;
  variantId?: string;
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
  media: ProductMedia[];
  description: string;
  longDescription: string;
  detailedDescription: string;
  categoryId: string;
  categoryName: string;
  categorySlug?: string;
  isActive: boolean;
  capacities: ProductCapacityOption[];
};

export type ProductListQuery = {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  tableCapacity?: number;
  color?: string;
  inStock?: boolean;
  search?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
};

export type ProductFacets = {
  colors: string[];
  tableCapacities: number[];
  minimumPrice: number | null;
  maximumPrice: number | null;
};

export type ProductPage = Omit<PagedResponse<ProductDto>, "items"> & {
  items: Product[];
};
