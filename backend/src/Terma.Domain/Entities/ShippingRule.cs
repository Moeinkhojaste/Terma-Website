using Terma.Domain.Common;
using Terma.Domain.Exceptions;

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

    public ShippingRule(string name, string? province, string? city, decimal cost, decimal? freeAboveSubtotal, int priority, bool isActive = true)
    {
        Apply(name, province, city, cost, freeAboveSubtotal, priority, isActive);
    }

    public void Update(string name, string? province, string? city, decimal cost, decimal? freeAboveSubtotal, int priority, bool isActive)
    {
        Apply(name, province, city, cost, freeAboveSubtotal, priority, isActive);
        MarkUpdated();
    }

    public bool Matches(string province, string city) =>
        IsActive &&
        (string.IsNullOrWhiteSpace(Province) || string.Equals(Province, province?.Trim(), StringComparison.OrdinalIgnoreCase)) &&
        (string.IsNullOrWhiteSpace(City) || string.Equals(City, city?.Trim(), StringComparison.OrdinalIgnoreCase));

    public decimal Calculate(decimal subtotal) =>
        FreeAboveSubtotal.HasValue && subtotal >= FreeAboveSubtotal.Value ? 0 : Cost;

    public void SetActive(bool active)
    {
        IsActive = active;
        MarkUpdated();
    }

    private void Apply(string name, string? province, string? city, decimal cost, decimal? freeAboveSubtotal, int priority, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new DomainException("Shipping rule name is required.");
        if (cost < 0) throw new DomainException("Shipping cost cannot be negative.");
        if (freeAboveSubtotal.HasValue && freeAboveSubtotal.Value < 0) throw new DomainException("Free shipping threshold cannot be negative.");

        Name = name.Trim();
        Province = string.IsNullOrWhiteSpace(province) ? null : province.Trim();
        City = string.IsNullOrWhiteSpace(city) ? null : city.Trim();
        Cost = cost;
        FreeAboveSubtotal = freeAboveSubtotal;
        Priority = priority;
        IsActive = isActive;
    }
}
