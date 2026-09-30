import {
  StoreDeliveryIcon,
  AuthenticityShieldIcon,
  ReplacementGuaranteeIcon,
} from "@/components/ui/icons";

export function ProductTrustBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`product-trust-badges ${className}`.trim()} aria-label="مزایا و ضمانت‌های خرید">
      <div className="product-trust-badge">
        <StoreDeliveryIcon className="product-trust-badge__icon" />
        <span>ارسال توسط فروشگاه</span>
      </div>
      <div className="product-trust-badge">
        <AuthenticityShieldIcon className="product-trust-badge__icon" />
        <span>گارانتی اصالت و سلامت فیزیکی کالا</span>
      </div>
      <div className="product-trust-badge">
        <ReplacementGuaranteeIcon className="product-trust-badge__icon" />
        <span>ضمانت تعویض کالا</span>
      </div>
    </div>
  );
}
