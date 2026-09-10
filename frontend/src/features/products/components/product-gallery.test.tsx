import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { createProduct } from "@/test/product-fixture";

describe("ProductGallery", () => {
  it("selects a product image from its thumbnail without displaying description text", () => {
    const product = createProduct();
    render(<ProductGallery media={product.media} productName={product.name} />);

    expect(screen.queryByText("نمای تاشده")).not.toBeInTheDocument();
    expect(screen.queryByText("روی میز")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("listitem", { name: "تصویر ۲" }));

    expect(screen.getByRole("button", { name: /نمایش تمام‌صفحه/ })).toBeInTheDocument();
    expect(screen.getByText("۲ / ۲")).toBeInTheDocument();
  });
});
