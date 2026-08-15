using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class SecurityAuditEvent : BaseEntity
{
    public string Actor { get; private set; } = string.Empty;
    public string Action { get; private set; } = string.Empty;
    public string Target { get; private set; } = string.Empty;
    public string Outcome { get; private set; } = string.Empty;
    public string? TraceId { get; private set; }
    public string? SourceIp { get; private set; }
    public DateTime TimestampUtc { get; private set; } = DateTime.UtcNow;

    private SecurityAuditEvent() { }

    public SecurityAuditEvent(string actor, string action, string target, string outcome, string? traceId = null, string? sourceIp = null)
    {
        Actor = string.IsNullOrWhiteSpace(actor) ? "anonymous" : actor.Trim();
        Action = action.Trim();
        Target = target.Trim();
        Outcome = outcome.Trim();
        TraceId = traceId?.Trim();
        SourceIp = sourceIp?.Trim();
        TimestampUtc = DateTime.UtcNow;
    }
}
