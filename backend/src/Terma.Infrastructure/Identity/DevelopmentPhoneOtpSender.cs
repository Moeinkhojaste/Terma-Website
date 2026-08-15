using Terma.Application.Customers;

namespace Terma.Infrastructure.Identity;

public sealed class DevelopmentPhoneOtpSender : IPhoneOtpSender
{
    public Task SendAsync(string normalizedPhone, string code, CancellationToken cancellationToken) => Task.CompletedTask;
}
