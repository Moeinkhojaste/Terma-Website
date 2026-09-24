import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { RemoveCartItemDialog } from "@/features/cart/remove-cart-item-dialog";
import { createProduct } from "@/test/product-fixture";
import type { CartItem } from "@/features/cart/cart-provider";

afterEach(cleanup);

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close() {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

describe("RemoveCartItemDialog", () => {
  const product = createProduct({ name: "رومیزی سنتی یزد" });
  const mockItem: CartItem = {
    lineId: "prod-1:var-1:Standard",
    productId: product.id,
    variantId: product.variantId,
    packagingType: "Standard",
    packagingFee: 0,
    product,
    quantity: 2,
  };

  it("does not render when item is null", () => {
    const { container } = render(
      <RemoveCartItemDialog item={null} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders product name, prompt question, and item info when item is provided", () => {
    render(
      <RemoveCartItemDialog item={mockItem} onClose={vi.fn()} onConfirm={vi.fn()} />
    );

    expect(screen.getByText("حذف محصول از سبد خرید")).toBeInTheDocument();
    expect(screen.getAllByText(/رومیزی سنتی یزد/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("انصراف")).toBeInTheDocument();
    expect(screen.getByText("بله، حذف شود")).toBeInTheDocument();
  });

  it("calls onClose when cancel button is clicked", () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <RemoveCartItemDialog item={mockItem} onClose={handleClose} onConfirm={handleConfirm} />
    );

    fireEvent.click(screen.getByText("انصراف"));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("calls onClose when close icon button is clicked", () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <RemoveCartItemDialog item={mockItem} onClose={handleClose} onConfirm={handleConfirm} />
    );

    fireEvent.click(screen.getByLabelText("بستن پنجره تأیید"));
    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when confirm button is clicked", () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <RemoveCartItemDialog item={mockItem} onClose={handleClose} onConfirm={handleConfirm} />
    );

    fireEvent.click(screen.getByText("بله، حذف شود"));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });
});
