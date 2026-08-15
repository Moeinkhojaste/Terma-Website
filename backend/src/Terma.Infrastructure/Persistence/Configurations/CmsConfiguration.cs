using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class CmsPageConfiguration : IEntityTypeConfiguration<CmsPage>
{
    public void Configure(EntityTypeBuilder<CmsPage> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(200).IsRequired();
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        builder.Property(x => x.RowVersion).IsConcurrencyToken();
        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => new { x.Status, x.PublishAtUtc });
    }
}

public sealed class CmsRevisionConfiguration : IEntityTypeConfiguration<CmsRevision>
{
    public void Configure(EntityTypeBuilder<CmsRevision> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.DocumentJson).IsRequired();
        builder.Property(x => x.CreatedBy).HasMaxLength(320).IsRequired();
        builder.HasIndex(x => new { x.PageId, x.Number }).IsUnique();
        builder.HasOne<CmsPage>().WithMany().HasForeignKey(x => x.PageId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class MediaAssetConfiguration : IEntityTypeConfiguration<MediaAsset>
{
    public void Configure(EntityTypeBuilder<MediaAsset> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.StorageKey).HasMaxLength(260).IsRequired();
        builder.Property(x => x.PublicUrl).HasMaxLength(1024).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(240).IsRequired();
        builder.Property(x => x.AltText).HasMaxLength(500).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(100).IsRequired();
        builder.HasIndex(x => x.StorageKey).IsUnique();
        builder.HasIndex(x => x.Name);
    }
}
