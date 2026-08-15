using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Identity;

public sealed class SecurityAuditService(TermaDbContext dbContext) : ISecurityAuditService
{
    public async Task LogAsync(string actor, string action, string target, string outcome, string? traceId = null, string? sourceIp = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var auditEvent = new SecurityAuditEvent(actor, action, target, outcome, traceId, sourceIp);
            await dbContext.SecurityAuditEvents.AddAsync(auditEvent, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch
        {
            // Security audit logging must never crash the main application pipeline.
        }
    }
}
