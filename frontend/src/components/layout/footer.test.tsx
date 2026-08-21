import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";

describe("Footer", () => {
  it("does not render buying guide column and renders social media links", () => {
    render(<Footer />);

    expect(screen.queryByText("راهنمای خرید")).toBeNull();

    const instagramLink = screen.getByRole("link", { name: /اینستاگرام/i });
    expect(instagramLink).toBeInTheDocument();
    expect(instagramLink).toHaveAttribute("target", "_blank");
    expect(instagramLink).toHaveAttribute("href", expect.stringContaining("instagram.com"));

    const telegramLink = screen.getByRole("link", { name: /تلگرام/i });
    expect(telegramLink).toBeInTheDocument();
    expect(telegramLink).toHaveAttribute("target", "_blank");
    expect(telegramLink).toHaveAttribute("href", expect.stringContaining("t.me"));

    const whatsappLink = screen.getByRole("link", { name: /واتساپ/i });
    expect(whatsappLink).toBeInTheDocument();
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("renders privacy and terms links under rules section", () => {
    render(<Footer />);

    const privacyLink = screen.getByRole("link", { name: "حریم خصوصی" });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute("href", "/privacy");

    const termsLink = screen.getByRole("link", { name: "شرایط استفاده" });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute("href", "/terms");
  });

  it("renders brand mark and navigation links", () => {
    render(<Footer />);

    expect(screen.getByText("ترما")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "درباره ما" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "ارتباط با ما" })).toHaveAttribute("href", "/contact");
  });
});
