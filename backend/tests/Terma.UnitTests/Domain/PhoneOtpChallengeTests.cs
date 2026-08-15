using Terma.Domain.Entities;

namespace Terma.UnitTests.Domain;

public sealed class PhoneOtpChallengeTests
{
    [Fact]
    public void Verify_AllowsOneSuccessfulUse()
    {
        var now = DateTime.UtcNow;
        var challenge = new PhoneOtpChallenge("989121234567", "hash", "ip", now, now.AddMinutes(5));
        Assert.Equal(OtpVerificationResult.Succeeded, challenge.Verify(true, now.AddMinutes(1)));
        Assert.Equal(OtpVerificationResult.Consumed, challenge.Verify(true, now.AddMinutes(1)));
    }

    [Fact]
    public void Verify_LocksAfterFiveFailures()
    {
        var now = DateTime.UtcNow;
        var challenge = new PhoneOtpChallenge("989121234567", "hash", "ip", now, now.AddMinutes(5));
        for (var attempt = 0; attempt < 4; attempt++) Assert.Equal(OtpVerificationResult.Invalid, challenge.Verify(false, now));
        Assert.Equal(OtpVerificationResult.AttemptsExceeded, challenge.Verify(false, now));
        Assert.Equal(OtpVerificationResult.AttemptsExceeded, challenge.Verify(true, now));
    }

    [Fact]
    public void Verify_RejectsExpiredCode()
    {
        var now = DateTime.UtcNow;
        var challenge = new PhoneOtpChallenge("989121234567", "hash", "ip", now, now.AddMinutes(5));
        Assert.Equal(OtpVerificationResult.Expired, challenge.Verify(true, now.AddMinutes(6)));
    }
}
