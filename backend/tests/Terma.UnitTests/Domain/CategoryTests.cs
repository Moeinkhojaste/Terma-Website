using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class CategoryTests
{
    [Fact]
    public void Create_TrimsValues()
    {
        var category = new Category("  Tablecloths  ", "  Traditional textiles  ");

        Assert.Equal("Tablecloths", category.Name);
        Assert.Equal("Traditional textiles", category.Description);
        Assert.True(category.IsActive);
    }

    [Fact]
    public void Create_WithEmptyName_Throws()
    {
        Assert.Throws<DomainException>(() => new Category(" ", null));
    }

    [Fact]
    public void Update_CanReactivateCategory()
    {
        var category = new Category("Tablecloths", null);
        category.Deactivate();

        category.Update("Tablecloths", null, true);

        Assert.True(category.IsActive);
        Assert.NotNull(category.UpdatedAt);
    }
}
