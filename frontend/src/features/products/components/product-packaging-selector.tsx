"use client";

import type { PackagingType } from "@/features/cart/cart-provider";
import { GiftIcon, PackageIcon } from "@/components/ui/icons";

export type ProductPackagingSelectorProps = {
  selectedPackaging: PackagingType;
  onChange: (packaging: PackagingType) => void;
  giftPrice: number;
  isGiftEnabled: boolean;
};

export function ProductPackagingSelector({
  selectedPackaging,
  onChange,
  giftPrice,
  isGiftEnabled,
}: ProductPackagingSelectorProps) {
  const formattedGiftPrice = new Intl.NumberFormat("fa-IR").format(giftPrice);

  return (
    <fieldset className="packaging-selector mt-6 pt-5 border-t border-[var(--line,#e5e7eb)]" role="radiogroup" aria-label="انتخاب نوع بسته‌بندی">
      <legend className="font-semibold text-sm text-[var(--charcoal,#1e293b)] p-0 mb-3">نوع بسته‌بندی</legend>
      <div className="packaging-options grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Standard option */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedPackaging === "Standard"}
          className={`packaging-option flex items-center justify-between p-3.5 rounded-lg border text-right transition-all cursor-pointer ${
            selectedPackaging === "Standard"
              ? "border-teal-700 bg-teal-50/60 ring-1 ring-teal-700 font-medium text-teal-950"
              : "border-stone-200 bg-white hover:border-stone-300 text-stone-800"
          }`}
          onClick={() => onChange("Standard")}
        >
          <div className="flex items-center gap-2.5">
            <PackageIcon className={`size-5 shrink-0 ${selectedPackaging === "Standard" ? "text-teal-700" : "text-stone-500"}`} />
            <span className="text-sm font-medium">بسته‌بندی معمولی</span>
          </div>
          <span className="text-xs text-stone-500 shrink-0">رایگان</span>
        </button>

        {/* GiftBox option */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedPackaging === "GiftBox"}
          disabled={!isGiftEnabled}
          className={`packaging-option flex items-center justify-between p-3.5 rounded-lg border text-right transition-all ${
            !isGiftEnabled
              ? "opacity-50 cursor-not-allowed bg-stone-100 border-stone-200 text-stone-400"
              : selectedPackaging === "GiftBox"
              ? "border-teal-700 bg-teal-50/60 ring-1 ring-teal-700 font-medium text-teal-950 cursor-pointer"
              : "border-stone-200 bg-white hover:border-stone-300 text-stone-800 cursor-pointer"
          }`}
          onClick={() => isGiftEnabled && onChange("GiftBox")}
        >
          <div className="flex items-center gap-2.5">
            <GiftIcon className={`size-5 shrink-0 ${selectedPackaging === "GiftBox" ? "text-teal-700" : "text-stone-500"}`} />
            <span className="text-sm font-medium">بسته‌بندی کادویی (جعبه)</span>
          </div>
          {isGiftEnabled ? (
            <span className={`text-xs shrink-0 ${selectedPackaging === "GiftBox" ? "text-teal-800 font-semibold" : "text-stone-600 font-medium"}`}>
              {formattedGiftPrice} تومان
            </span>
          ) : (
            <span className="text-xs text-stone-400 shrink-0">ناموجود</span>
          )}
        </button>
      </div>
    </fieldset>
  );
}
