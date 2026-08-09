using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public class Product : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public decimal Price { get; private set; }
    public int CapacityPersons { get; private set; }
    public string ImageUrl { get; private set; } = string.Empty;
    public bool IsActive { get; private set; } = true;

    private Product() { } // For EF Core

    public Product(string name, string slug, string description, decimal price, int capacityPersons, string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Product name cannot be empty.");
        if (price < 0)
            throw new DomainException("Product price cannot be negative.");
        if (capacityPersons <= 0)
            throw new DomainException("Capacity persons must be greater than zero.");

        Name = name;
        Slug = slug;
        Description = description;
        Price = price;
        CapacityPersons = capacityPersons;
        ImageUrl = imageUrl;
    }

    public void UpdatePrice(decimal newPrice)
    {
        if (newPrice < 0)
            throw new DomainException("Product price cannot be negative.");
        Price = newPrice;
        UpdatedAt = DateTime.UtcNow;
    }
}
