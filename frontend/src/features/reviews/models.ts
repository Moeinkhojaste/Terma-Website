export type ReviewStatus = "Pending" | "Approved" | "Rejected";

export type ProductReview = {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  title: string | null;
  comment: string;
  adminResponse: string | null;
  createdAt: string;
};

export type RatingDistribution = {
  oneStar: number;
  twoStars: number;
  threeStars: number;
  fourStars: number;
  fiveStars: number;
};

export type ProductReviewsSummary = {
  averageRating: number;
  totalReviewsCount: number;
  distribution: RatingDistribution;
  reviews: {
    items: ProductReview[];
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
};

export type CustomerReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage?: string | null;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  adminResponse: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type AdminProductReview = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  rating: number;
  title: string | null;
  comment: string;
  status: ReviewStatus;
  adminResponse: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt?: string | null;
};

export type CreateReviewInput = {
  productId: string;
  rating: number;
  title?: string;
  comment: string;
};

export type PagedAdminReviews = {
  items: AdminProductReview[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};
