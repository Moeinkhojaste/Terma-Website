using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class ProductMediaConfiguration : IEntityTypeConfiguration<ProductMedia>
{
    public void Configure(EntityTypeBuilder<ProductMedia> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.PublicUrl).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.AltText).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Kind).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.HasIndex(x => new { x.ProductId, x.SortOrder });
        builder.HasOne(x => x.Product).WithMany(x => x.Media).HasForeignKey(x => x.ProductId).OnDelete(DeleteBehavior.Cascade);
    }
}
