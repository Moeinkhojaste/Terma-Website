import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AccountProfileClient } from "./account-profile-client";
import * as accountApi from "./account-api";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { CartProvider } from "@/features/cart/cart-provider";
import { WishlistProvider } from "@/features/account/wishlist-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/account/profile",
}));

describe("AccountProfileClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(accountApi, "getCustomerProfile").mockResolvedValue({
      userId: "u1",
      fullName: "مریم احمدی",
      phone: "09121234567",
      email: "maryam@example.com",
      orderCount: 1,
      wishlistCount: 0,
      addressCount: 1,
      createdAt: new Date().toISOString(),
    });
  });

  it("renders profile edit form and allows updating name and email", async () => {
    const updateSpy = vi.spyOn(accountApi, "updateCustomerProfile").mockResolvedValue({
      userId: "u1",
      fullName: "مریم احمدی نژاد",
      phone: "09121234567",
      email: "newmaryam@example.com",
      orderCount: 1,
      wishlistCount: 0,
      addressCount: 1,
      createdAt: new Date().toISOString(),
    });

    render(
      <FeedbackProvider>
        <CartProvider>
          <WishlistProvider>
            <AccountProfileClient />
          </WishlistProvider>
        </CartProvider>
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("مریم احمدی")).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue("مریم احمدی");
    fireEvent.change(nameInput, { target: { value: "مریم احمدی نژاد" } });

    const saveBtn = screen.getByRole("button", { name: "ذخیره تغییرات" });
    fireEvent.click(saveBtn);

    expect(updateSpy).toHaveBeenCalledWith({
      fullName: "مریم احمدی نژاد",
      email: "maryam@example.com",
    });
  });
});
