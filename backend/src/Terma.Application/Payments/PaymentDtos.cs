namespace Terma.Application.Payments;

public sealed record PaymentInitiateRequest(Guid OrderId, string? Gateway = "ZarinPal");

public sealed record TorobEligibilityDto(
    bool Eligible,
    string? TitleMessage,
    string? Description);

/// <param name="ErrorMessage">Technical cause for logs, admin screens and support. Never shown to customers.</param>
/// <param name="CustomerMessage">Customer-safe explanation for the storefront. Must not contain gateway internals.</param>
public sealed record PaymentInitiateResponse(
    bool Success,
    string? PaymentUrl,
    string? Authority,
    string? ErrorMessage,
    string? CustomerMessage = null);

/// <param name="ErrorMessage">Technical cause for logs, admin screens and support. Never shown to customers.</param>
/// <param name="CustomerMessage">Customer-safe explanation for the storefront. Must not contain gateway internals.</param>
public sealed record PaymentVerificationResult(
    bool Success,
    long? RefId,
    string? CardPan,
    string? CardHash,
    int? Code,
    string? ErrorMessage,
    string? CustomerMessage = null);

public sealed record PaymentTransactionDto(
    Guid Id,
    Guid OrderId,
    string Gateway,
    string Authority,
    decimal Amount,
    string Currency,
    string Status,
    long? RefId,
    string? CardPan,
    DateTime CreatedAt,
    DateTime? VerifiedAt);
