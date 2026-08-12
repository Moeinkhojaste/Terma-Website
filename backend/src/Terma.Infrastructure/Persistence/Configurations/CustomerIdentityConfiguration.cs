using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;
using Terma.Infrastructure.Identity;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class CustomerIdentityConfiguration :
    IEntityTypeConfiguration<ApplicationUser>,
    IEntityTypeConfiguration<PhoneOtpChallenge>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(x => x.AccountType).HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.HasIndex(x => x.PhoneNumber)
            .IsUnique()
            .HasFilter("[PhoneNumber] IS NOT NULL");
    }

    public void Configure(EntityTypeBuilder<PhoneOtpChallenge> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.NormalizedPhone).HasMaxLength(16).IsRequired();
        builder.Property(x => x.CodeHash).HasMaxLength(64).IsRequired();
        builder.Property(x => x.RequestIpHash).HasMaxLength(64).IsRequired();
        builder.HasIndex(x => new { x.NormalizedPhone, x.RequestedAtUtc });
        builder.HasIndex(x => new { x.RequestIpHash, x.RequestedAtUtc });
    }
}
