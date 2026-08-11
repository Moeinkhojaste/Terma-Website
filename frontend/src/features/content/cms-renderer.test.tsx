import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CmsBlockRenderer, RichTextOutput } from "./cms-renderer";

describe("CMS renderer", () => {
  it("renders only supported rich-text nodes without injecting HTML", () => {
    render(<RichTextOutput node={{ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>", marks: [{ type: "bold" }] }] }] }} />);
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("replaces an unsafe CTA link with a harmless anchor", () => {
    render(<CmsBlockRenderer block={{ id: crypto.randomUUID(), type: "cta", data: { title: "خرید", text: "توضیح", label: "ادامه", href: "javascript:alert(1)" } }} />);
    expect(screen.getByRole("link", { name: "ادامه" })).toHaveAttribute("href", "#");
  });

  it("renders FAQ items as accessible details controls", () => {
    render(<CmsBlockRenderer block={{ id: crypto.randomUUID(), type: "faq", data: { title: "پرسش‌ها", items: [{ question: "سؤال", answer: "پاسخ" }] } }} />);
    expect(screen.getByText("سؤال").closest("summary")).toBeInTheDocument();
  });
});
