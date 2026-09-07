import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminLoginPage } from "./admin-login-page";
import * as authApi from "./auth-api";

const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: mockRefresh,
  }),
}));

describe("AdminLoginPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders login form with admin@termabrand.ir and no leaked credentials", () => {
    render(<AdminLoginPage />);

    expect(screen.getByRole("heading", { name: "ورود مدیر" })).toBeInTheDocument();

    const emailInput = screen.getByLabelText("ایمیل") as HTMLInputElement;
    expect(emailInput.value).toBe("admin@termabrand.ir");

    const passwordInput = screen.getByLabelText("رمز عبور") as HTMLInputElement;
    expect(passwordInput.value).toBe("");

    expect(screen.queryByText(/admin@terma\.local/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AdminPassword123!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/اطلاعات ورود مدیریت/i)).not.toBeInTheDocument();

    expect(screen.getByRole("button", { name: "فراموشی یا تغییر رمز عبور؟" })).toBeInTheDocument();
  });

  it("switches to reset request view and back to login", () => {
    render(<AdminLoginPage />);

    fireEvent.click(screen.getByRole("button", { name: "فراموشی یا تغییر رمز عبور؟" }));

    expect(screen.getByRole("heading", { name: "تغییر رمز عبور" })).toBeInTheDocument();
    expect(screen.getByLabelText("ایمیل حساب مدیر")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ارسال کد تأیید به ایمیل" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "بازگشت به صفحه ورود" }));
    expect(screen.getByRole("heading", { name: "ورود مدیر" })).toBeInTheDocument();
  });

  it("handles full reset flow from request to confirmation", async () => {
    const challengeId = "11111111-2222-3333-4444-555555555555";

    vi.spyOn(authApi, "requestAdminPasswordReset").mockResolvedValue({
      challengeId,
      expiresInSeconds: 120,
      developmentCode: "654321",
      message: "کد تأیید ارسال شد",
    });

    vi.spyOn(authApi, "confirmAdminPasswordReset").mockResolvedValue({
      message: "رمز عبور با موفقیت تغییر کرد",
    });

    render(<AdminLoginPage />);

    // Switch to reset mode
    fireEvent.click(screen.getByRole("button", { name: "فراموشی یا تغییر رمز عبور؟" }));

    // Submit reset request
    fireEvent.click(screen.getByRole("button", { name: "ارسال کد تأیید به ایمیل" }));

    await waitFor(() => {
      expect(authApi.requestAdminPasswordReset).toHaveBeenCalledWith("admin@termabrand.ir");
    });

    // Should now be on confirmation screen
    expect(screen.getByRole("heading", { name: "تأیید کد و تغییر رمز" })).toBeInTheDocument();
    expect(screen.getByText("654321")).toBeInTheDocument();

    // Fill form
    const codeInput = screen.getByLabelText("کد تأیید ۶ رقمی");
    const newPassInput = screen.getByLabelText("رمز عبور جدید (حداقل ۱۲ کاراکتر)");
    const confirmPassInput = screen.getByLabelText("تکرار رمز عبور جدید");

    fireEvent.change(codeInput, { target: { value: "654321" } });
    fireEvent.change(newPassInput, { target: { value: "SuperSecret2026!#" } });
    fireEvent.change(confirmPassInput, { target: { value: "SuperSecret2026!#" } });

    fireEvent.click(screen.getByRole("button", { name: "تغییر رمز عبور" }));

    await waitFor(() => {
      expect(authApi.confirmAdminPasswordReset).toHaveBeenCalledWith(
        challengeId,
        "654321",
        "SuperSecret2026!#",
        "SuperSecret2026!#"
      );
    });

    // Verify returning to login screen with success alert
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "ورود مدیر" })).toBeInTheDocument();
      expect(screen.getByText(/رمز عبور با موفقیت تغییر یافت/i)).toBeInTheDocument();
    });
  });
});
