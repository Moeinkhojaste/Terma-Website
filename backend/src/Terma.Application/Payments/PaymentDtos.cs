namespace Terma.Application.Payments;

public sealed record PaymentInitiateRequest(Guid OrderId);

public sealed record PaymentInitiateResponse(
    bool Success,
    string? PaymentUrl,
    string? Authority,
    string? ErrorMessage);

public sealed record PaymentVerificationResult(
    bool Success,
    long? RefId,
    string? CardPan,
    string? CardHash,
    int? Code,
    string? ErrorMessage);

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
