namespace Terma.Application.Common.Interfaces;

public interface ISecurityAuditService
{
    Task LogAsync(string actor, string action, string target, string outcome, string? traceId = null, string? sourceIp = null, CancellationToken cancellationToken = default);
}
