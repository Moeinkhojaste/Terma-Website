import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AdminProductMediaPage } from "./admin-product-media-page";
import * as authApi from "./auth-api";
import * as storeApi from "./store-api";
import * as cmsApi from "@/features/content/cms-api";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "prod-nila-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/products/prod-nila-1/media",
}));

describe("AdminProductMediaPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, "getAdminSession").mockResolvedValue({
      email: "admin@termabrand.ir",
      role: "SuperAdmin",
      expiresAtUtc: new Date().toISOString(),
    });
    vi.spyOn(storeApi, "getProductMedia").mockResolvedValue([]);
    vi.spyOn(cmsApi, "listCmsMedia").mockResolvedValue([]);
  });

  it("renders page title and empty gallery notice initially", async () => {
    render(<AdminProductMediaPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "گالری محصول" })).toBeInTheDocument();
    });

    expect(screen.getByText("آپلود عکس واقعی")).toBeInTheDocument();
    expect(screen.getByText("افزودن به گالری محصول")).toBeInTheDocument();
    expect(screen.getByText(/هنوز تصویری برای این محصول ثبت نشده است/)).toBeInTheDocument();
  });

  it("handles image upload successfully and defaults altText to name if empty", async () => {
    const uploadedAsset = {
      id: "asset-1",
      storageKey: "test-key.webp",
      publicUrl: "/api/media/test-key.webp",
      name: "nila 6",
      altText: "nila 6",
      contentType: "image/webp",
      length: 12345,
      createdAt: new Date().toISOString(),
    };

    let receivedFormData: FormData | undefined;
    vi.spyOn(cmsApi, "uploadCmsMedia").mockImplementation(async (form: FormData) => {
      receivedFormData = form;
      return uploadedAsset;
    });

    render(<AdminProductMediaPage />);

    await waitFor(() => {
      expect(screen.getByText("آپلود عکس واقعی")).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText("فایل تصویر");
    const nameInput = screen.getByLabelText("نام تصویر");
    const form = fileInput.closest("form")!;

    const file = new File(["fake-image-bytes"], "Editing_studio_16224711.jpeg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(nameInput, { target: { value: "nila 6" } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(cmsApi.uploadCmsMedia).toHaveBeenCalledTimes(1);
    });

    expect(receivedFormData?.get("altText")).toBe("nila 6");
    expect(receivedFormData?.get("name")).toBe("nila 6");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "nila 6" })).toBeInTheDocument();
    });
  });
});
