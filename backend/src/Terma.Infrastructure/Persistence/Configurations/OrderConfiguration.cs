using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;
using Terma.Infrastructure.Identity;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Number).HasMaxLength(32).IsRequired();
        builder.HasIndex(x => x.Number).IsUnique();
        builder.Property(x => x.TrackingTokenHash).HasMaxLength(128);
        builder.Property(x => x.PostalTrackingCode).HasMaxLength(64);
        builder.Property(x => x.IdempotencyKey).HasMaxLength(128);
        builder.Property(x => x.RequestFingerprint).HasMaxLength(128);
        builder.HasIndex(x => x.IdempotencyKey).IsUnique().HasFilter("[IdempotencyKey] IS NOT NULL");
        builder.Property(x => x.FullNameSnapshot).HasMaxLength(200).IsRequired();
        builder.Property(x => x.PhoneSnapshot).HasMaxLength(32).IsRequired();
        builder.Property(x => x.EmailSnapshot).HasMaxLength(320);
        builder.Property(x => x.Province).HasMaxLength(120).IsRequired();
        builder.Property(x => x.City).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Address).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.PostalCode).HasMaxLength(32).IsRequired();
        builder.Property(x => x.CustomerNotes).HasMaxLength(1000);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(40);
        builder.Property(x => x.Subtotal).HasPrecision(18, 2);
        builder.Property(x => x.DiscountTotal).HasPrecision(18, 2);
        builder.Property(x => x.ShippingTotal).HasPrecision(18, 2);
        builder.Property(x => x.Total).HasPrecision(18, 2);
        builder.HasOne(x => x.Customer).WithMany().HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => x.UserId);
        builder.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasMany(x => x.Items).WithOne(x => x.Order).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.History).WithOne(x => x.Order).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Payments).WithOne(x => x.Order).HasForeignKey(x => x.OrderId).OnDelete(DeleteBehavior.Cascade);
    }
}
