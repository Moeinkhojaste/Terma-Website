using Terma.Domain.Entities;

namespace Terma.Application.Payments;

public interface IPaymentGatewayService
{
    Task<PaymentInitiateResponse> RequestPaymentAsync(Order order, string callbackUrl, CancellationToken cancellationToken = default);
    Task<PaymentVerificationResult> VerifyPaymentAsync(decimal amount, string authority, CancellationToken cancellationToken = default);
}
