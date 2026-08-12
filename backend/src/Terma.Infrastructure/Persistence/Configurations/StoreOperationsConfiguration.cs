using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;
using Terma.Infrastructure.Identity;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class StoreOperationsConfiguration : IEntityTypeConfiguration<Customer>, IEntityTypeConfiguration<OrderItem>, IEntityTypeConfiguration<OrderStatusHistory>, IEntityTypeConfiguration<Promotion>, IEntityTypeConfiguration<ShippingRule>, IEntityTypeConfiguration<ContactMessage>, IEntityTypeConfiguration<StoreContent>
{
    public void Configure(EntityTypeBuilder<Customer> builder)
    {
        builder.HasKey(x => x.Id); builder.Property(x => x.FullName).HasMaxLength(200).IsRequired(); builder.Property(x => x.Phone).HasMaxLength(32).IsRequired(); builder.Property(x => x.NormalizedPhone).HasMaxLength(32).IsRequired(); builder.Property(x => x.Email).HasMaxLength(320); builder.Property(x => x.TotalOrderValue).HasPrecision(18, 2); builder.HasIndex(x => x.NormalizedPhone).IsUnique(); builder.HasIndex(x => x.UserId).IsUnique().HasFilter("[UserId] IS NOT NULL"); builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
    }
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.ProductName).HasMaxLength(200).IsRequired(); builder.Property(x => x.Sku).HasMaxLength(64).IsRequired(); builder.Property(x => x.UnitPrice).HasPrecision(18, 2); }
    public void Configure(EntityTypeBuilder<OrderStatusHistory> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(40); builder.HasIndex(x => new { x.OrderId, x.CreatedAt }); }
    public void Configure(EntityTypeBuilder<Promotion> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.Name).HasMaxLength(200).IsRequired(); builder.Property(x => x.Code).HasMaxLength(64); builder.Property(x => x.Type).HasConversion<string>().HasMaxLength(20); builder.Property(x => x.DiscountType).HasConversion<string>().HasMaxLength(20); builder.Property(x => x.Value).HasPrecision(18, 2); builder.Property(x => x.MinimumSubtotal).HasPrecision(18, 2); builder.Property(x => x.MaximumDiscount).HasPrecision(18, 2); builder.HasIndex(x => x.Code).IsUnique().HasFilter("[Code] IS NOT NULL"); }
    public void Configure(EntityTypeBuilder<ShippingRule> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.Name).HasMaxLength(200).IsRequired(); builder.Property(x => x.Province).HasMaxLength(120); builder.Property(x => x.City).HasMaxLength(120); builder.Property(x => x.Cost).HasPrecision(18, 2); builder.Property(x => x.FreeAboveSubtotal).HasPrecision(18, 2); builder.HasIndex(x => new { x.Priority, x.IsActive }); }
    public void Configure(EntityTypeBuilder<ContactMessage> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.Name).HasMaxLength(200).IsRequired(); builder.Property(x => x.Phone).HasMaxLength(32).IsRequired(); builder.Property(x => x.Email).HasMaxLength(320); builder.Property(x => x.Topic).HasMaxLength(200).IsRequired(); builder.Property(x => x.Body).HasMaxLength(8000).IsRequired(); builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20); }
    public void Configure(EntityTypeBuilder<StoreContent> builder)
    { builder.HasKey(x => x.Id); builder.Property(x => x.PageKey).HasMaxLength(80).IsRequired(); builder.Property(x => x.SectionKey).HasMaxLength(120).IsRequired(); builder.Property(x => x.Title).HasMaxLength(500).IsRequired(); builder.Property(x => x.Body).HasMaxLength(12000).IsRequired(); builder.Property(x => x.LinkUrl).HasMaxLength(1024); builder.Property(x => x.ImageUrl).HasMaxLength(1024); builder.Property(x => x.SeoTitle).HasMaxLength(300); builder.Property(x => x.SeoDescription).HasMaxLength(1000); builder.HasIndex(x => new { x.PageKey, x.SectionKey }).IsUnique(); }
}
