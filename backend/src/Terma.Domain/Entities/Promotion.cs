using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public enum PromotionType { Automatic, Coupon }
public enum DiscountType { Percentage, FixedAmount }

public sealed class Promotion : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Code { get; private set; }
    public PromotionType Type { get; private set; }
    public DiscountType DiscountType { get; private set; }
    public decimal Value { get; private set; }
    public decimal? MinimumSubtotal { get; private set; }
    public decimal? MaximumDiscount { get; private set; }
    public int? UsageLimit { get; private set; }
    public int UsageCount { get; private set; }
    public DateTime StartsAtUtc { get; private set; }
    public DateTime? EndsAtUtc { get; private set; }
    public bool IsActive { get; private set; } = true;
    private Promotion() { }
    public Promotion(string name, string? code, PromotionType type, DiscountType discountType, decimal value,
        decimal? minimumSubtotal, decimal? maximumDiscount, int? usageLimit, DateTime startsAtUtc, DateTime? endsAtUtc)
    {
        Name = name.Trim(); Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant(); Type = type; DiscountType = discountType; Value = value; MinimumSubtotal = minimumSubtotal; MaximumDiscount = maximumDiscount; UsageLimit = usageLimit; StartsAtUtc = startsAtUtc; EndsAtUtc = endsAtUtc;
    }
    public bool Applies(string? code, decimal subtotal, DateTime now) => IsActive && (!EndsAtUtc.HasValue || now <= EndsAtUtc) && now >= StartsAtUtc && (Type == PromotionType.Automatic || string.Equals(Code, code?.Trim(), StringComparison.OrdinalIgnoreCase)) && (!MinimumSubtotal.HasValue || subtotal >= MinimumSubtotal) && (!UsageLimit.HasValue || UsageCount < UsageLimit);
    public decimal Calculate(decimal subtotal) => Math.Min(MaximumDiscount ?? decimal.MaxValue, DiscountType == DiscountType.Percentage ? subtotal * Value / 100m : Value);
    public void IncrementUsage() { UsageCount++; MarkUpdated(); }
    public void SetActive(bool active) { IsActive = active; MarkUpdated(); }
}
