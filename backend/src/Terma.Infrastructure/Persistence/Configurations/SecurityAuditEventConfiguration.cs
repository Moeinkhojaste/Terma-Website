using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Configurations;

public sealed class SecurityAuditEventConfiguration : IEntityTypeConfiguration<SecurityAuditEvent>
{
    public void Configure(EntityTypeBuilder<SecurityAuditEvent> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Actor).HasMaxLength(256).IsRequired();
        builder.Property(x => x.Action).HasMaxLength(120).IsRequired();
        builder.Property(x => x.Target).HasMaxLength(500).IsRequired();
        builder.Property(x => x.Outcome).HasMaxLength(50).IsRequired();
        builder.Property(x => x.TraceId).HasMaxLength(128);
        builder.Property(x => x.SourceIp).HasMaxLength(64);
        builder.HasIndex(x => x.TimestampUtc);
        builder.HasIndex(x => new { x.Action, x.TimestampUtc });
        builder.HasIndex(x => new { x.Actor, x.TimestampUtc });
    }
}
