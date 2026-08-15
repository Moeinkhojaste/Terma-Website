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

public sealed record CustomerProfileDto(
    Guid UserId,
    string FullName,
    string Phone,
    string? Email,
    int OrderCount,
    int WishlistCount,
    int AddressCount,
    DateTime CreatedAt);

public sealed class UpdateProfileRequest
{
    [Required, StringLength(100, MinimumLength = 2)]
    public string FullName { get; init; } = string.Empty;

    [EmailAddress, StringLength(200)]
    public string? Email { get; init; }
}

public sealed record RequestPhoneChangeRequest(
    [Required, StringLength(32, MinimumLength = 10)] string NewPhone);

public sealed record VerifyPhoneChangeRequest(
    Guid ChallengeId,
    [Required, RegularExpression("^[0-9۰-۹٠-٩]{6}$")] string Code,
    [Required, StringLength(32, MinimumLength = 10)] string NewPhone);

public sealed record CustomerAddressDto(
    Guid Id,
    string Title,
    string ReceiverName,
    string ReceiverPhone,
    string Province,
    string City,
    string Address,
    string PostalCode,
    bool IsDefault,
    DateTime CreatedAt);

public sealed class AddressWriteRequest
{
    [StringLength(50)]
    public string Title { get; init; } = "آدرس من";

    [Required, StringLength(100, MinimumLength = 2)]
    public string ReceiverName { get; init; } = string.Empty;

    [Required, StringLength(32, MinimumLength = 10)]
    public string ReceiverPhone { get; init; } = string.Empty;

    [Required, StringLength(80)]
    public string Province { get; init; } = string.Empty;

    [Required, StringLength(80)]
    public string City { get; init; } = string.Empty;

    [Required, StringLength(500, MinimumLength = 5)]
    public string Address { get; init; } = string.Empty;

    [Required, StringLength(30, MinimumLength = 5)]
    public string PostalCode { get; init; } = string.Empty;

    public bool IsDefault { get; init; }
}

public sealed record WishlistItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSlug,
    decimal Price,
    decimal? CompareAtPrice,
    string? ImageUrl,
    bool InStock,
    string? CategoryName,
    DateTime CreatedAt);

public sealed record CustomerDashboardDto(
    CustomerProfileDto Profile,
    IReadOnlyList<CustomerOrderSummaryDto> RecentOrders,
    CustomerAddressDto? DefaultAddress,
    int TotalOrders,
    int PendingOrders,
    int WishlistCount,
    int AddressCount);

public sealed record CustomerOrderSummaryDto(
    Guid Id,
    string Number,
    OrderStatus Status,
    decimal Total,
    DateTime CreatedAt,
    int ItemCount,
    string? PostalTrackingCode = null);

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
    string? PostalTrackingCode,
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

    // Profile & Phone Change
    Task<CustomerProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken);
    Task<CustomerProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken);
    Task<RequestOtpResponse> RequestPhoneChangeOtpAsync(Guid userId, string newPhone, string remoteIp, CancellationToken cancellationToken);
    Task<VerifyOtpServiceResult> VerifyPhoneChangeOtpAsync(Guid userId, Guid challengeId, string code, string newPhone, CancellationToken cancellationToken);

    // Dashboard
    Task<CustomerDashboardDto> GetDashboardAsync(Guid userId, CancellationToken cancellationToken);

    // Addresses
    Task<IReadOnlyList<CustomerAddressDto>> GetAddressesAsync(Guid userId, CancellationToken cancellationToken);
    Task<CustomerAddressDto> CreateAddressAsync(Guid userId, AddressWriteRequest request, CancellationToken cancellationToken);
    Task<CustomerAddressDto> UpdateAddressAsync(Guid userId, Guid addressId, AddressWriteRequest request, CancellationToken cancellationToken);
    Task DeleteAddressAsync(Guid userId, Guid addressId, CancellationToken cancellationToken);
    Task<CustomerAddressDto> SetDefaultAddressAsync(Guid userId, Guid addressId, CancellationToken cancellationToken);

    // Wishlist
    Task<IReadOnlyList<WishlistItemDto>> GetWishlistAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Guid>> GetWishlistProductIdsAsync(Guid userId, CancellationToken cancellationToken);
    Task<bool> ToggleWishlistAsync(Guid userId, Guid productId, CancellationToken cancellationToken);
    Task RemoveFromWishlistAsync(Guid userId, Guid productId, CancellationToken cancellationToken);
}

public interface IPhoneOtpSender
{
    Task SendAsync(string normalizedPhone, string code, CancellationToken cancellationToken);
}
