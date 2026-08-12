using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Models;
using Terma.Application.Customers;
using Terma.Domain.Entities;
using Terma.Domain.Services;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Identity;

public sealed class CustomerAccountService(
    TermaDbContext db,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IPhoneOtpSender sender,
    IOptions<OtpOptions> options,
    IWebHostEnvironment environment,
    TimeProvider timeProvider) : ICustomerAccountService
{
    private static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan RequestWindow = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendDelay = TimeSpan.FromSeconds(60);
    private readonly OtpOptions _options = options.Value;

    public async Task<RequestOtpResponse> RequestOtpAsync(string phone, string remoteIp, CancellationToken cancellationToken)
    {
        EnsureHashKey();
        var normalizedPhone = IranianPhoneNumber.Normalize(phone);
        var now = timeProvider.GetUtcNow().UtcDateTime;
        var since = now - RequestWindow;
        var ipHash = Hash($"ip:{remoteIp}");

        var latest = await db.PhoneOtpChallenges
            .Where(x => x.NormalizedPhone == normalizedPhone)
            .OrderByDescending(x => x.RequestedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
        if (latest is not null && latest.RequestedAtUtc + ResendDelay > now)
        {
            var retry = Math.Max(1, (int)Math.Ceiling((latest.RequestedAtUtc + ResendDelay - now).TotalSeconds));
            throw new TooManyRequestsException("Wait before requesting another verification code.", retry);
        }

        if (await db.PhoneOtpChallenges.CountAsync(x => x.NormalizedPhone == normalizedPhone && x.RequestedAtUtc >= since, cancellationToken) >= 3)
            throw new TooManyRequestsException("Too many verification codes were requested for this mobile number.", 600);
        if (await db.PhoneOtpChallenges.CountAsync(x => x.RequestIpHash == ipHash && x.RequestedAtUtc >= since, cancellationToken) >= 5)
            throw new TooManyRequestsException("Too many verification codes were requested from this address.", 600);

        var active = await db.PhoneOtpChallenges
            .Where(x => x.NormalizedPhone == normalizedPhone && x.ConsumedAtUtc == null && x.InvalidatedAtUtc == null && x.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);
        foreach (var challenge in active) challenge.Invalidate(now);

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var entity = new PhoneOtpChallenge(normalizedPhone, Hash($"otp:{normalizedPhone}:{code}"), ipHash, now, now + OtpLifetime);
        await db.PhoneOtpChallenges.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        await sender.SendAsync(normalizedPhone, code, cancellationToken);

        var expose = environment.IsDevelopment() && _options.ExposeDevelopmentCode;
        return new RequestOtpResponse(entity.Id, new DateTimeOffset(entity.ExpiresAtUtc, TimeSpan.Zero), (int)ResendDelay.TotalSeconds, expose ? code : null);
    }

    public async Task<VerifyOtpServiceResult> VerifyOtpAsync(Guid challengeId, string code, CancellationToken cancellationToken)
    {
        EnsureHashKey();
        var challenge = await db.PhoneOtpChallenges.SingleOrDefaultAsync(x => x.Id == challengeId, cancellationToken);
        if (challenge is null) return new(null, null, 0, VerifyOtpFailure.NotFound);

        var normalizedCode = NormalizeCode(code);
        var expected = Encoding.UTF8.GetBytes(challenge.CodeHash);
        var actual = Encoding.UTF8.GetBytes(Hash($"otp:{challenge.NormalizedPhone}:{normalizedCode}"));
        var matches = expected.Length == actual.Length && CryptographicOperations.FixedTimeEquals(expected, actual);
        var verification = challenge.Verify(matches, timeProvider.GetUtcNow().UtcDateTime);
        if (verification != OtpVerificationResult.Succeeded)
        {
            await db.SaveChangesAsync(cancellationToken);
            return new(null, null, 0, verification switch
            {
                OtpVerificationResult.Expired => VerifyOtpFailure.Expired,
                OtpVerificationResult.Consumed => VerifyOtpFailure.Consumed,
                OtpVerificationResult.AttemptsExceeded => VerifyOtpFailure.AttemptsExceeded,
                _ => VerifyOtpFailure.Invalid
            });
        }

        await EnsureCustomerRoleAsync();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var userName = $"customer-{challenge.NormalizedPhone}";
        var user = await userManager.FindByNameAsync(userName);
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = userName,
                PhoneNumber = challenge.NormalizedPhone,
                PhoneNumberConfirmed = true,
                AccountType = ApplicationUserType.Customer
            };
            EnsureSucceeded(await userManager.CreateAsync(user), "Could not create the customer account.");
        }
        if (user.AccountType != ApplicationUserType.Customer)
            throw new InvalidOperationException("The resolved Identity user is not a customer account.");
        if (!await userManager.IsInRoleAsync(user, CustomerAuthorization.Role))
            EnsureSucceeded(await userManager.AddToRoleAsync(user, CustomerAuthorization.Role), "Could not assign the customer role.");

        var customer = await db.Customers.SingleOrDefaultAsync(x => x.NormalizedPhone == challenge.NormalizedPhone, cancellationToken);
        if (customer is not null) customer.AttachToUser(user.Id);
        var orders = await db.Orders
            .Where(x => x.UserId == null && x.Customer.NormalizedPhone == challenge.NormalizedPhone)
            .ToListAsync(cancellationToken);
        foreach (var order in orders) order.AttachToUser(user.Id);

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new(user.Id, IranianPhoneNumber.ToLocalDisplay(challenge.NormalizedPhone), orders.Count, VerifyOtpFailure.None);
    }

    public async Task<PagedResult<CustomerOrderSummaryDto>> OrdersAsync(Guid userId, int page, int pageSize, CancellationToken cancellationToken)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);
        var query = db.Orders.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new CustomerOrderSummaryDto(x.Id, x.Number, x.Status, x.Total, x.CreatedAt, x.Items.Sum(i => i.Quantity)))
            .ToListAsync(cancellationToken);
        return new(items, page, pageSize, total);
    }

    public async Task<CustomerOrderDetailsDto> OrderAsync(Guid userId, Guid orderId, CancellationToken cancellationToken)
    {
        var result = await db.Orders.AsNoTracking().Where(x => x.Id == orderId && x.UserId == userId)
            .Select(x => new CustomerOrderDetailsDto(
                x.Id, x.Number, x.Status, x.FullNameSnapshot, x.PhoneSnapshot, x.Province, x.City, x.Address, x.PostalCode,
                x.Subtotal, x.DiscountTotal, x.ShippingTotal, x.Total, x.CreatedAt,
                x.Items.OrderBy(i => i.CreatedAt).Select(i => new CustomerOrderItemDto(i.ProductId, i.VariantId, i.ProductName, i.Sku, i.UnitPrice, i.Quantity, i.UnitPrice * i.Quantity)).ToList(),
                x.History.OrderBy(h => h.CreatedAt).Select(h => new CustomerOrderHistoryDto(h.Status, h.CreatedAt)).ToList()))
            .SingleOrDefaultAsync(cancellationToken);
        return result ?? throw new NotFoundException("Order was not found.");
    }

    private async Task EnsureCustomerRoleAsync()
    {
        if (await roleManager.RoleExistsAsync(CustomerAuthorization.Role)) return;
        var result = await roleManager.CreateAsync(new IdentityRole<Guid>(CustomerAuthorization.Role));
        if (!result.Succeeded && !await roleManager.RoleExistsAsync(CustomerAuthorization.Role))
            EnsureSucceeded(result, "Could not create the customer role.");
    }

    private void EnsureHashKey()
    {
        if (string.IsNullOrWhiteSpace(_options.HashKey) || _options.HashKey.Length < 32)
            throw new InvalidOperationException("Otp:HashKey must be configured with at least 32 characters.");
        if (!environment.IsDevelopment() && _options.HashKey.StartsWith("Terma-development-only", StringComparison.Ordinal))
            throw new InvalidOperationException("A production OTP hash key must be configured outside source control.");
    }

    private string Hash(string value)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.HashKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    private static string NormalizeCode(string code) => new(code.Select(value => value switch
    {
        >= '\u06F0' and <= '\u06F9' => (char)('0' + value - '\u06F0'),
        >= '\u0660' and <= '\u0669' => (char)('0' + value - '\u0660'),
        _ => value
    }).ToArray());

    private static void EnsureSucceeded(IdentityResult result, string message)
    {
        if (result.Succeeded) return;
        throw new InvalidOperationException($"{message} {string.Join(" ", result.Errors.Select(x => x.Description))}");
    }
}
