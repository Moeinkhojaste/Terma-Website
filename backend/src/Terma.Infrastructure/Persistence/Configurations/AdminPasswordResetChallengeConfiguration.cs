using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class AdminPasswordResetChallengeConfiguration : IEntityTypeConfiguration<AdminPasswordResetChallenge>
{
    public void Configure(EntityTypeBuilder<AdminPasswordResetChallenge> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.AdminEmail).HasMaxLength(256).IsRequired();
        builder.Property(x => x.CodeHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RequestIpHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => new { x.AdminEmail, x.RequestedAtUtc });
        builder.HasIndex(x => new { x.RequestIpHash, x.RequestedAtUtc });
    }
}