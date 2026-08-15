using System.Text.Json.Serialization;
using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PromotionType { Automatic, Coupon }

[JsonConverter(typeof(JsonStringEnumConverter))]
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
        decimal? minimumSubtotal, decimal? maximumDiscount, int? usageLimit, DateTime startsAtUtc, DateTime? endsAtUtc, bool isActive = true)
    {
        Apply(name, code, type, discountType, value, minimumSubtotal, maximumDiscount, usageLimit, startsAtUtc, endsAtUtc, isActive);
    }

    public void Update(string name, string? code, PromotionType type, DiscountType discountType, decimal value,
        decimal? minimumSubtotal, decimal? maximumDiscount, int? usageLimit, DateTime startsAtUtc, DateTime? endsAtUtc, bool isActive)
    {
        Apply(name, code, type, discountType, value, minimumSubtotal, maximumDiscount, usageLimit, startsAtUtc, endsAtUtc, isActive);
        MarkUpdated();
    }

    public bool Applies(string? code, decimal subtotal, DateTime now) =>
        IsActive &&
        (!EndsAtUtc.HasValue || now <= EndsAtUtc) &&
        now >= StartsAtUtc &&
        (Type == PromotionType.Automatic || string.Equals(Code, code?.Trim(), StringComparison.OrdinalIgnoreCase)) &&
        (!MinimumSubtotal.HasValue || subtotal >= MinimumSubtotal) &&
        (!UsageLimit.HasValue || UsageCount < UsageLimit);

    public decimal Calculate(decimal subtotal) =>
        Math.Min(MaximumDiscount ?? decimal.MaxValue, DiscountType == DiscountType.Percentage ? subtotal * Value / 100m : Value);

    public void IncrementUsage()
    {
        if (UsageLimit.HasValue && UsageCount >= UsageLimit.Value)
            throw new DomainException("Promotion usage limit has been reached.");
        UsageCount++;
        MarkUpdated();
    }

    public void SetActive(bool active)
    {
        IsActive = active;
        MarkUpdated();
    }

    private void Apply(string name, string? code, PromotionType type, DiscountType discountType, decimal value,
        decimal? minimumSubtotal, decimal? maximumDiscount, int? usageLimit, DateTime startsAtUtc, DateTime? endsAtUtc, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("Promotion name is required.");
        if (type == PromotionType.Coupon && string.IsNullOrWhiteSpace(code)) throw new DomainException("Coupon code is required for coupon promotions.");
        if (value <= 0) throw new DomainException("Promotion value must be greater than zero.");
        if (discountType == DiscountType.Percentage && (value <= 0 || value > 100)) throw new DomainException("Percentage discount must be between 1 and 100.");
        if (minimumSubtotal.HasValue && minimumSubtotal.Value < 0) throw new DomainException("Minimum subtotal cannot be negative.");
        if (maximumDiscount.HasValue && maximumDiscount.Value <= 0) throw new DomainException("Maximum discount must be greater than zero.");
        if (usageLimit.HasValue && usageLimit.Value <= 0) throw new DomainException("Usage limit must be greater than zero.");
        if (endsAtUtc.HasValue && startsAtUtc > endsAtUtc.Value) throw new DomainException("Start date cannot be after end date.");

        Name = name.Trim();
        Code = string.IsNullOrWhiteSpace(code) ? null : code.Trim().ToUpperInvariant();
        Type = type;
        DiscountType = discountType;
        Value = value;
        MinimumSubtotal = minimumSubtotal;
        MaximumDiscount = maximumDiscount;
        UsageLimit = usageLimit;
        StartsAtUtc = startsAtUtc == default ? DateTime.UtcNow : startsAtUtc;
        EndsAtUtc = endsAtUtc;
        IsActive = isActive;
    }
}
