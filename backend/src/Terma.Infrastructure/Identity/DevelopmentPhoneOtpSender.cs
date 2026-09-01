using Microsoft.Extensions.Logging;
using Terma.Application.Customers;

namespace Terma.Infrastructure.Identity;

public sealed class DevelopmentPhoneOtpSender(ILogger<DevelopmentPhoneOtpSender> logger) : IPhoneOtpSender
{
    public Task SendAsync(string normalizedPhone, string code, CancellationToken cancellationToken)
    {
        logger.LogInformation(">>> [TERMA OTP] Verification code for {Phone}: {Code} <<<", normalizedPhone, code);
        return Task.CompletedTask;
    }
}
