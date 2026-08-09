using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class ShippingRule : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Province { get; private set; }
    public string? City { get; private set; }
    public decimal Cost { get; private set; }
    public decimal? FreeAboveSubtotal { get; private set; }
    public int Priority { get; private set; }
    public bool IsActive { get; private set; } = true;
    private ShippingRule() { }
    public ShippingRule(string name, string? province, string? city, decimal cost, decimal? freeAboveSubtotal, int priority)
    { Name = name.Trim(); Province = province?.Trim(); City = city?.Trim(); Cost = cost; FreeAboveSubtotal = freeAboveSubtotal; Priority = priority; }
    public bool Matches(string province, string city) => IsActive && (string.IsNullOrWhiteSpace(Province) || Province == province) && (string.IsNullOrWhiteSpace(City) || City == city);
    public decimal Calculate(decimal subtotal) => FreeAboveSubtotal.HasValue && subtotal >= FreeAboveSubtotal ? 0 : Cost;
    public void SetActive(bool active) { IsActive = active; MarkUpdated(); }
}
