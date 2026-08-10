using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Sku).IsRequired().HasMaxLength(64);
        builder.Property(p => p.Description).HasMaxLength(4000);
        builder.Property(p => p.Price).HasPrecision(18, 2);
        builder.Property(p => p.CompareAtPrice).HasPrecision(18, 2);
        builder.Property(p => p.DiscountPercent);
        builder.Property(p => p.Length).HasPrecision(10, 2);
        builder.Property(p => p.Width).HasPrecision(10, 2);
        builder.Property(p => p.FabricType).IsRequired().HasMaxLength(150);
        builder.Property(p => p.LiningType).IsRequired().HasMaxLength(150);
        builder.Property(p => p.Color).IsRequired().HasMaxLength(300);
        builder.Property(p => p.Pattern).IsRequired().HasMaxLength(500);

        builder.HasIndex(p => p.Sku).IsUnique();
        builder.HasIndex(p => p.CategoryId);
        builder.HasIndex(p => new { p.IsActive, p.CategoryId });
        builder.HasIndex(p => p.Price);
        builder.HasIndex(p => p.TableCapacity);

        builder.HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
