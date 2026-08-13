import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { createProduct } from "@/test/product-fixture";

describe("ProductGallery", () => {
  it("selects a real product angle from its thumbnail", () => {
    const product = createProduct();
    render(<ProductGallery media={product.media} productName={product.name} />);

    fireEvent.click(screen.getByRole("listitem", { name: /روی میز/ }));

    expect(screen.getByRole("button", { name: /نمایش تمام‌صفحه نمای روی میز/ })).toBeInTheDocument();
    expect(screen.getByText("۲ / ۲")).toBeInTheDocument();
  });
});
