using System.ComponentModel.DataAnnotations;
using Terma.Application.Common.Models;
using Terma.Domain.Entities;

namespace Terma.Application.Customers;

public sealed record RequestOtpRequest(
    [Required, StringLength(32, MinimumLength = 10)] string Phone);

public sealed record RequestOtpResponse(
    Guid ChallengeId,
    DateTimeOffset ExpiresAtUtc,
    int RetryAfterSeconds,
    string? DevelopmentCode);

public sealed record VerifyOtpRequest(
    Guid ChallengeId,
    [Required, RegularExpression("^[0-9۰-۹٠-٩]{6}$")] string Code);

public sealed record CustomerSessionDto(
    Guid UserId,
    string Phone,
    DateTimeOffset ExpiresAtUtc,
    int ClaimedOrderCount = 0);

public sealed record CustomerOrderSummaryDto(
    Guid Id,
    string Number,
    OrderStatus Status,
    decimal Total,
    DateTime CreatedAt,
    int ItemCount);

public sealed record CustomerOrderItemDto(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string Sku,
    decimal UnitPrice,
    int Quantity,
    decimal LineTotal);

public sealed record CustomerOrderHistoryDto(OrderStatus Status, DateTime CreatedAt);

public sealed record CustomerOrderDetailsDto(
    Guid Id,
    string Number,
    OrderStatus Status,
    string FullName,
    string Phone,
    string Province,
    string City,
    string Address,
    string PostalCode,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal ShippingTotal,
    decimal Total,
    DateTime CreatedAt,
    IReadOnlyList<CustomerOrderItemDto> Items,
    IReadOnlyList<CustomerOrderHistoryDto> History);

public enum VerifyOtpFailure { None, Invalid, Expired, Consumed, AttemptsExceeded, NotFound }
public sealed record VerifyOtpServiceResult(Guid? UserId, string? Phone, int ClaimedOrderCount, VerifyOtpFailure Failure);

public interface ICustomerAccountService
{
    Task<RequestOtpResponse> RequestOtpAsync(string phone, string remoteIp, CancellationToken cancellationToken);
    Task<VerifyOtpServiceResult> VerifyOtpAsync(Guid challengeId, string code, CancellationToken cancellationToken);
    Task<PagedResult<CustomerOrderSummaryDto>> OrdersAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken);
    Task<CustomerOrderDetailsDto> OrderAsync(Guid userId, Guid orderId, CancellationToken cancellationToken);
}

public interface IPhoneOtpSender
{
    Task SendAsync(string normalizedPhone, string code, CancellationToken cancellationToken);
}
