using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public enum OtpVerificationResult { Succeeded, Invalid, Expired, Consumed, AttemptsExceeded }

public sealed class PhoneOtpChallenge : BaseEntity
{
    public string NormalizedPhone { get; private set; } = string.Empty;
    public string CodeHash { get; private set; } = string.Empty;
    public string RequestIpHash { get; private set; } = string.Empty;
    public DateTime RequestedAtUtc { get; private set; }
    public DateTime ExpiresAtUtc { get; private set; }
    public int FailedAttempts { get; private set; }
    public DateTime? ConsumedAtUtc { get; private set; }
    public DateTime? InvalidatedAtUtc { get; private set; }

    private PhoneOtpChallenge() { }

    public PhoneOtpChallenge(string normalizedPhone, string codeHash, string requestIpHash, DateTime requestedAtUtc, DateTime expiresAtUtc)
    {
        NormalizedPhone = normalizedPhone;
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

    public OtpVerificationResult Verify(bool codeMatches, DateTime utcNow)
    {
        if (ConsumedAtUtc is not null || InvalidatedAtUtc is not null) return OtpVerificationResult.Consumed;
        if (ExpiresAtUtc <= utcNow) return OtpVerificationResult.Expired;
        if (FailedAttempts >= 5) return OtpVerificationResult.AttemptsExceeded;
        if (!codeMatches)
        {
            FailedAttempts++;
            MarkUpdated();
            return FailedAttempts >= 5 ? OtpVerificationResult.AttemptsExceeded : OtpVerificationResult.Invalid;
        }

        ConsumedAtUtc = utcNow;
        MarkUpdated();
        return OtpVerificationResult.Succeeded;
    }
}
