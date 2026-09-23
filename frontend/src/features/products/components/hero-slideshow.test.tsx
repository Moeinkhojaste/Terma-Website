import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroSlideshow } from "./hero-slideshow";

const mockSlides = [
  { src: "/images/slide-1.webp", alt: "تصویر ۱" },
  { src: "/images/slide-2.webp", alt: "تصویر ۲" },
  { src: "/images/slide-3.webp", alt: "تصویر ۳" },
];

describe("HeroSlideshow", () => {
  it("renders slides and both navigation controls with matched icon sizing", () => {
    render(<HeroSlideshow slides={mockSlides} />);

    const prevButton = screen.getByRole("button", { name: "تصویر قبلی" });
    const nextButton = screen.getByRole("button", { name: "تصویر بعدی" });

    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();

    const prevSvg = prevButton.querySelector("svg");
    const nextSvg = nextButton.querySelector("svg");

    expect(prevSvg).toBeInTheDocument();
    expect(nextSvg).toBeInTheDocument();

    // Verify both SVGs have identical sizing classes
    expect(prevSvg?.getAttribute("class")).toBe(nextSvg?.getAttribute("class"));
  });

  it("navigates forward and backward when buttons are clicked", () => {
    render(<HeroSlideshow slides={mockSlides} />);

    const nextButton = screen.getByRole("button", { name: "تصویر بعدی" });
    const prevButton = screen.getByRole("button", { name: "تصویر قبلی" });

    fireEvent.click(nextButton);
    const activeTabAfterNext = screen.getByRole("tab", { selected: true });
    expect(activeTabAfterNext).toHaveAttribute("aria-label", "نمایش تصویر ۲");

    fireEvent.click(prevButton);
    const activeTabAfterPrev = screen.getByRole("tab", { selected: true });
    expect(activeTabAfterPrev).toHaveAttribute("aria-label", "نمایش تصویر ۱");
  });
});
