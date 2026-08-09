using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.HasKey(category => category.Id);
        builder.Property(category => category.Name).IsRequired().HasMaxLength(150);
        builder.Property(category => category.Description).HasMaxLength(1000);
        builder.HasIndex(category => category.IsActive);
        builder.HasIndex(category => category.Name);
        builder.Navigation(category => category.Products)
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
