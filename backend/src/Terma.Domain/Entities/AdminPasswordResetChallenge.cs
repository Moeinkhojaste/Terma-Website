using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public enum AdminPasswordResetVerificationResult
{
    Succeeded,
    Invalid,
    Expired,
    Consumed,
    AttemptsExceeded
}

public sealed class AdminPasswordResetChallenge : BaseEntity
{
    public string AdminEmail { get; private set; } = string.Empty;
    public string CodeHash { get; private set; } = string.Empty;
    public string RequestIpHash { get; private set; } = string.Empty;
    public DateTime RequestedAtUtc { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public int FailedAttempts { get; private set; }
    public DateTime? ConsumedAtUtc { get; private set; }
    public DateTime? InvalidatedAtUtc { get; private set; }

    private AdminPasswordResetChallenge() { }

    public AdminPasswordResetChallenge(
        string adminEmail,
        string codeHash,
        string requestIpHash,
        DateTime requestedAtUtc,
        DateTime expiresAtUtc)
    {
        AdminEmail = adminEmail;
        CodeHash = codeHash;
        RequestIpHash = requestIpHash;
        RequestedAtUtc = requestedAtUtc;
        ExpiresAtUtc = expiresAtUtc;
    }

    public bool IsActive(DateTime utcNow) =>
        ConsumedAtUtc is null && InvalidatedAtUtc is null && FailedAttempts < 5 && ExpiresAtUtc > utcNow;

    public void Invalidate(DateTime utcNow)
    {
        if (ConsumedAtUtc is null && InvalidatedAtUtc is null)
        {
            InvalidatedAtUtc = utcNow;
            MarkUpdated();
        }
    }

    public AdminPasswordResetVerificationResult Verify(bool codeMatches, DateTime utcNow)
    {
        if (ConsumedAtUtc is not null || InvalidatedAtUtc is not null)
            return AdminPasswordResetVerificationResult.Consumed;

        if (ExpiresAtUtc <= utcNow)
            return AdminPasswordResetVerificationResult.Expired;

        if (FailedAttempts >= 5)
            return AdminPasswordResetVerificationResult.AttemptsExceeded;

        if (!codeMatches)
        {
            FailedAttempts++;
            MarkUpdated();
            return FailedAttempts >= 5
                ? AdminPasswordResetVerificationResult.AttemptsExceeded
                : AdminPasswordResetVerificationResult.Invalid;
        }

        ConsumedAtUtc = utcNow;
        MarkUpdated();
        return AdminPasswordResetVerificationResult.Succeeded;
    }
}