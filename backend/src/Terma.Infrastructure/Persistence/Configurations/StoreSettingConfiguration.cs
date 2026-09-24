using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class StoreSettingConfiguration : IEntityTypeConfiguration<StoreSetting>
{
    public void Configure(EntityTypeBuilder<StoreSetting> builder)
    {
        builder.ToTable("StoreSettings");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Key).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.Key).IsUnique();
        builder.Property(x => x.Value).HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(300);

        builder.HasData(
            new StoreSetting(Guid.Parse("11111111-1111-1111-1111-111111111101"), "Packaging:GiftBoxPrice", "200000", "هزینه بسته‌بندی کادویی داخل جعبه به تومان"),
            new StoreSetting(Guid.Parse("11111111-1111-1111-1111-111111111102"), "Packaging:GiftBoxEnabled", "true", "فعال/غیرفعال بودن انتخاب بسته‌بندی کادویی در فروشگاه")
        );
    }
}
