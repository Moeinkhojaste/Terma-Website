import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RatingStars } from "./components/rating-stars";
import { ProductReviewsSection } from "./components/product-reviews-section";
import * as reviewApi from "./review-api";
import * as accountApi from "@/features/account/account-api";
import type { Product } from "@/features/products/models";

vi.mock("next/navigation", () => ({
  usePathname: () => "/products/nila",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockProduct: Product = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "ترمه شاه‌عباسی نیلا",
  slug: "nila",
  price: "۲,۵۰۰,۰۰۰ تومان",
  priceValue: 2500000,
  categoryId: "22222222-2222-2222-2222-222222222222",
  categoryName: "ترمه کلاسیک",
  categorySlug: "classic",
  colors: "سرمه‌ای و طلایی",
  pattern: "شاه‌عباسی",
  fabricType: "ابریشم طبیعی",
  lining: "ساتن تافته",
  size: 6,
  capacity: "۶ نفره",
  dimensions: "۱۰۰ × ۱۵۰ سانتی‌متر",
  description: "ترمه فاخر دستباف",
  longDescription: "توضیحات کامل ترمه نیلا",
  stock: "موجود در انبار",
  stockQuantity: 10,
  sku: "NILA-01",
  hasDiscount: false,
  image: "/images/nila-folded.webp",
  tableImage: "/images/nila-table.webp",
  imageAlt: "تصویر نیلا",
  tableImageAlt: "تصویر نیلا روی میز",
  isActive: true,
  media: [],
  capacities: [],
};

describe("RatingStars Component", () => {
  it("renders non-interactive rating stars with accessible label", () => {
    render(<RatingStars rating={4} size="md" />);
    expect(screen.getByLabelText(/امتیاز ۴ از ۵/i)).toBeDefined();
  });

  it("handles interactive star selection", () => {
    const handleRatingChange = vi.fn();
    render(<RatingStars rating={3} interactive={true} onRatingChange={handleRatingChange} />);

    const starButtons = screen.getAllByRole("radio");
    expect(starButtons).toHaveLength(5);

    fireEvent.click(starButtons[4]); // 5th star
    expect(handleRatingChange).toHaveBeenCalledWith(5);
  });
});

describe("ProductReviewsSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders guest view when user is not logged in", async () => {
    vi.spyOn(reviewApi, "getProductReviews").mockResolvedValue({
      averageRating: 4.5,
      totalReviewsCount: 2,
      distribution: {
        oneStar: 0,
        twoStars: 0,
        threeStars: 0,
        fourStars: 1,
        fiveStars: 1,
      },
      reviews: {
        items: [
          {
            id: "rev-1",
            productId: mockProduct.id,
            customerName: "سارا حسینی",
            rating: 5,
            title: "فوق‌العاده زیبا",
            comment: "رنگ سرمه‌ای و طلایی آن در واقعیت بسیار چشم‌نوازتر از عکس است.",
            adminResponse: "با تشکر از حسن سلیقه شما",
            createdAt: new Date().toISOString(),
          },
        ],
        page: 1,
        pageSize: 10,
        totalCount: 1,
        totalPages: 1,
      },
    });

    vi.spyOn(accountApi, "getCustomerSession").mockRejectedValue(new Error("Unauthorized"));

    render(<ProductReviewsSection product={mockProduct} />);

    expect(await screen.findByText(/نظرات و امتیازهای محصول/i)).toBeDefined();
    expect(await screen.findByText(/سارا حسینی/i)).toBeDefined();
    expect(await screen.findByText(/پاسخ ترما/i)).toBeDefined();
    expect(screen.getByText(/ورود به حساب کاربری/i)).toBeDefined();
  });

  it("renders review submission form when user is logged in", async () => {
    vi.spyOn(reviewApi, "getProductReviews").mockResolvedValue({
      averageRating: 0,
      totalReviewsCount: 0,
      distribution: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
      reviews: { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 0 },
    });

    vi.spyOn(accountApi, "getCustomerSession").mockResolvedValue({
      userId: "user-1",
      phone: "09121234567",
      expiresAtUtc: new Date().toISOString(),
      claimedOrderCount: 1,
    });

    vi.spyOn(reviewApi, "getMyProductReview").mockResolvedValue(null);

    render(<ProductReviewsSection product={mockProduct} />);

    expect(await screen.findByText(/ثبت نظر و امتیاز شما/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/نقاط قوت، جنس پارچه، تجربه استفاده/i)).toBeDefined();
  });
});
