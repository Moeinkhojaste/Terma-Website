using Terma.Domain.Entities;

namespace Terma.Application.Payments;

public interface ITorobPayGatewayService
{
    Task<TorobEligibilityDto> CheckEligibilityAsync(decimal amountInTomans, CancellationToken cancellationToken = default);
    Task<PaymentInitiateResponse> RequestPaymentAsync(Order order, string callbackUrl, CancellationToken cancellationToken = default);
    Task<PaymentVerificationResult> VerifyPaymentAsync(string paymentToken, CancellationToken cancellationToken = default);
    Task<bool> SettlePaymentAsync(string paymentToken, CancellationToken cancellationToken = default);
    Task<bool> RevertPaymentAsync(string paymentToken, CancellationToken cancellationToken = default);
}
