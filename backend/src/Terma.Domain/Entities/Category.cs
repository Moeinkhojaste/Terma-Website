using Terma.Domain.Common;
using Terma.Domain.Exceptions;
using Terma.Domain.Services;

namespace Terma.Domain.Entities;

public class Category : BaseEntity
{
    private readonly List<Product> _products = [];

    public string Name { get; private set; } = string.Empty;
    public string Slug { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public bool IsActive { get; private set; } = true;
    public IReadOnlyCollection<Product> Products => _products.AsReadOnly();

    private Category() { }

    public Category(string name, string? description, bool isActive = true, string? slug = null)
    {
        Slug = string.IsNullOrWhiteSpace(slug) ? PersianSlugHelper.GenerateSlug(name) : PersianSlugHelper.NormalizeSlug(slug);
        ApplyChanges(name, description, isActive);
    }

    public void Update(string name, string? description, bool isActive, string? slug = null)
    {
        if (!string.IsNullOrWhiteSpace(slug))
        {
            Slug = PersianSlugHelper.NormalizeSlug(slug);
        }
        ApplyChanges(name, description, isActive);
        MarkUpdated();
    }

    public void SetSlug(string slug)
    {
        Slug = PersianSlugHelper.NormalizeSlug(slug);
        MarkUpdated();
    }

    public void Deactivate()
    {
        if (!IsActive)
        {
            return;
        }

        IsActive = false;
        MarkUpdated();
    }

    private void ApplyChanges(string name, string? description, bool isActive)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Category name is required.");
        }

        Name = name.Trim();
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        IsActive = isActive;
    }
}
