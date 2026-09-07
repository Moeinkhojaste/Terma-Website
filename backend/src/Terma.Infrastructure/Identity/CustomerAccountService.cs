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
    private static readonly TimeSpan ResendDelay = TimeSpan.FromMinutes(2);
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
            throw new TooManyRequestsException("لطفاً پیش از درخواست مجدد کد تأیید، ۲ دقیقه صبر نمایید.", retry);
        }

        if (await db.PhoneOtpChallenges.CountAsync(x => x.NormalizedPhone == normalizedPhone && x.RequestedAtUtc >= since, cancellationToken) >= 5)
        {
            var oldest = await db.PhoneOtpChallenges
                .Where(x => x.NormalizedPhone == normalizedPhone && x.RequestedAtUtc >= since)
                .OrderBy(x => x.RequestedAtUtc)
                .Select(x => x.RequestedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
            var retry = Math.Max(1, (int)Math.Ceiling((oldest + RequestWindow - now).TotalSeconds));
            throw new TooManyRequestsException("سقف درخواست کد ورود برای این شماره (۵ بار در ۱۰ دقیقه) تکمیل شده است. لطفاً تا پایان ۱۰ دقیقه صبر کنید.", retry);
        }

        if (await db.PhoneOtpChallenges.CountAsync(x => x.RequestIpHash == ipHash && x.RequestedAtUtc >= since, cancellationToken) >= 5)
        {
            var oldest = await db.PhoneOtpChallenges
                .Where(x => x.RequestIpHash == ipHash && x.RequestedAtUtc >= since)
                .OrderBy(x => x.RequestedAtUtc)
                .Select(x => x.RequestedAtUtc)
                .FirstOrDefaultAsync(cancellationToken);
            var retry = Math.Max(1, (int)Math.Ceiling((oldest + RequestWindow - now).TotalSeconds));
            throw new TooManyRequestsException("تعداد درخواست‌های کد ورود بیش از حد مجاز است. لطفاً تا پایان ۱۰ دقیقه صبر کنید.", retry);
        }

        var active = await db.PhoneOtpChallenges
            .Where(x => x.NormalizedPhone == normalizedPhone && x.ConsumedAtUtc == null && x.InvalidatedAtUtc == null && x.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);
        foreach (var challenge in active) challenge.Invalidate(now);

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var entity = new PhoneOtpChallenge(normalizedPhone, Hash($"otp:{normalizedPhone}:{code}"), ipHash, now, now + OtpLifetime);
        await db.PhoneOtpChallenges.AddAsync(entity, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        try
        {
            await sender.SendAsync(normalizedPhone, code, cancellationToken);
        }
        catch
        {
            entity.Invalidate(now);
            await db.SaveChangesAsync(cancellationToken);
            throw;
        }

        var expose = _options.ExposeDevelopmentCode;
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
        if (customer is not null)
        {
            customer.AttachToUser(user.Id);
        }
        else
        {
            customer = new Customer("کاربر گرامی", IranianPhoneNumber.ToLocalDisplay(challenge.NormalizedPhone), null);
            customer.AttachToUser(user.Id);
            await db.Customers.AddAsync(customer, cancellationToken);
        }

        var orders = await db.Orders
            .Include(x => x.Customer)
            .Where(x => x.UserId == null && x.Customer.NormalizedPhone == challenge.NormalizedPhone)
            .ToListAsync(cancellationToken);
        foreach (var order in orders) order.AttachToUser(user.Id);

        var hasAddress = await db.CustomerAddresses.AnyAsync(x => x.UserId == user.Id, cancellationToken);
        if (!hasAddress)
        {
            var latestOrder = orders.OrderByDescending(x => x.CreatedAt).FirstOrDefault()
                ?? await db.Orders
                    .Include(x => x.Customer)
                    .Where(x => x.UserId == user.Id || x.Customer.NormalizedPhone == challenge.NormalizedPhone)
                    .OrderByDescending(x => x.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);

            if (latestOrder is not null)
            {
                var userPhone = IranianPhoneNumber.ToLocalDisplay(challenge.NormalizedPhone);
                var defaultAddress = new CustomerAddress(
                    user.Id,
                    "آدرس پیش‌فرض",
                    string.IsNullOrWhiteSpace(latestOrder.Customer?.FullName) ? (customer?.FullName ?? user.UserName ?? "کاربر گرامی") : latestOrder.Customer.FullName,
                    userPhone,
                    latestOrder.Province,
                    latestOrder.City,
                    latestOrder.Address,
                    latestOrder.PostalCode,
                    isDefault: true);
                await db.CustomerAddresses.AddAsync(defaultAddress, cancellationToken);
            }
        }

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
            .Select(x => new CustomerOrderSummaryDto(x.Id, x.Number, x.Status, x.Total, x.CreatedAt, x.Items.Sum(i => i.Quantity), x.PostalTrackingCode))
            .ToListAsync(cancellationToken);
        return new(items, page, pageSize, total);
    }

    public async Task<CustomerOrderDetailsDto> OrderAsync(Guid userId, Guid orderId, CancellationToken cancellationToken)
    {
        var result = await db.Orders.AsNoTracking().Where(x => x.Id == orderId && x.UserId == userId)
            .Select(x => new CustomerOrderDetailsDto(
                x.Id, x.Number, x.Status, x.FullNameSnapshot, x.PhoneSnapshot, x.Province, x.City, x.Address, x.PostalCode,
                x.Subtotal, x.DiscountTotal, x.ShippingTotal, x.Total, x.CreatedAt, x.PostalTrackingCode,
                x.Items.OrderBy(i => i.CreatedAt).Select(i => new CustomerOrderItemDto(i.ProductId, i.VariantId, i.ProductName, i.Sku, i.UnitPrice, i.Quantity, i.UnitPrice * i.Quantity)).ToList(),
                x.History.OrderBy(h => h.CreatedAt).Select(h => new CustomerOrderHistoryDto(h.Status, h.CreatedAt)).ToList()))
            .SingleOrDefaultAsync(cancellationToken);
        return result ?? throw new NotFoundException("Order was not found.");
    }

    public async Task<CustomerProfileDto> GetProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("حساب کاربری یافت نشد.");

        var customer = await db.Customers.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        var orderCount = await db.Orders.CountAsync(x => x.UserId == userId, cancellationToken);
        var wishlistCount = await db.WishlistItems.CountAsync(x => x.UserId == userId, cancellationToken);
        var addressCount = await db.CustomerAddresses.CountAsync(x => x.UserId == userId, cancellationToken);

        var fullName = customer?.FullName ?? "کاربر گرامی";
        var phone = IranianPhoneNumber.ToLocalDisplay(user.PhoneNumber ?? customer?.Phone ?? string.Empty);
        var email = customer?.Email ?? user.Email;

        return new CustomerProfileDto(
            userId,
            fullName,
            phone,
            email,
            orderCount,
            wishlistCount,
            addressCount,
            customer?.CreatedAt ?? DateTime.UtcNow);
    }

    public async Task<CustomerProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("حساب کاربری یافت نشد.");

        var customer = await db.Customers.FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        var phone = user.PhoneNumber ?? string.Empty;
        var cleanEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim();

        if (customer is null)
        {
            customer = new Customer(request.FullName, phone, cleanEmail);
            customer.AttachToUser(userId);
            await db.Customers.AddAsync(customer, cancellationToken);
        }
        else
        {
            customer.RefreshProfile(request.FullName, customer.Phone, cleanEmail);
        }

        if (user.Email != cleanEmail)
        {
            user.Email = cleanEmail;
            await userManager.UpdateAsync(user);
        }

        await db.SaveChangesAsync(cancellationToken);
        return await GetProfileAsync(userId, cancellationToken);
    }

    public async Task<CustomerDashboardDto> GetDashboardAsync(Guid userId, CancellationToken cancellationToken)
    {
        var profile = await GetProfileAsync(userId, cancellationToken);
        var recentOrdersQuery = db.Orders.AsNoTracking().Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt);
        var recentOrders = await recentOrdersQuery.Take(5)
            .Select(x => new CustomerOrderSummaryDto(x.Id, x.Number, x.Status, x.Total, x.CreatedAt, x.Items.Sum(i => i.Quantity), x.PostalTrackingCode))
            .ToListAsync(cancellationToken);

        var defaultAddress = await db.CustomerAddresses.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new CustomerAddressDto(x.Id, x.Title, x.ReceiverName, x.ReceiverPhone, x.Province, x.City, x.Address, x.PostalCode, x.IsDefault, x.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        var totalOrders = await recentOrdersQuery.CountAsync(cancellationToken);
        var pendingOrders = await db.Orders.CountAsync(x => x.UserId == userId && (x.Status == OrderStatus.PendingConfirmation || x.Status == OrderStatus.Confirmed || x.Status == OrderStatus.Preparing), cancellationToken);
        var wishlistCount = await db.WishlistItems.CountAsync(x => x.UserId == userId, cancellationToken);
        var addressCount = await db.CustomerAddresses.CountAsync(x => x.UserId == userId, cancellationToken);

        return new CustomerDashboardDto(
            profile,
            recentOrders,
            defaultAddress,
            totalOrders,
            pendingOrders,
            wishlistCount,
            addressCount);
    }

    public async Task<IReadOnlyList<CustomerAddressDto>> GetAddressesAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.CustomerAddresses.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new CustomerAddressDto(x.Id, x.Title, x.ReceiverName, x.ReceiverPhone, x.Province, x.City, x.Address, x.PostalCode, x.IsDefault, x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CustomerAddressDto> CreateAddressAsync(Guid userId, AddressWriteRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("حساب کاربری یافت نشد.");
        var userPhone = IranianPhoneNumber.ToLocalDisplay(user.PhoneNumber ?? string.Empty);

        var hasExistingAddresses = await db.CustomerAddresses.AnyAsync(x => x.UserId == userId, cancellationToken);
        var shouldBeDefault = request.IsDefault || !hasExistingAddresses;

        if (shouldBeDefault && hasExistingAddresses)
        {
            var defaults = await db.CustomerAddresses.Where(x => x.UserId == userId && x.IsDefault).ToListAsync(cancellationToken);
            foreach (var addr in defaults) addr.SetDefault(false);
        }

        var address = new CustomerAddress(
            userId,
            request.Title,
            request.ReceiverName,
            userPhone,
            request.Province,
            request.City,
            request.Address,
            request.PostalCode,
            shouldBeDefault);

        await db.CustomerAddresses.AddAsync(address, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return new CustomerAddressDto(
            address.Id,
            address.Title,
            address.ReceiverName,
            address.ReceiverPhone,
            address.Province,
            address.City,
            address.Address,
            address.PostalCode,
            address.IsDefault,
            address.CreatedAt);
    }

    public async Task<CustomerAddressDto> UpdateAddressAsync(Guid userId, Guid addressId, AddressWriteRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new NotFoundException("حساب کاربری یافت نشد.");
        var userPhone = IranianPhoneNumber.ToLocalDisplay(user.PhoneNumber ?? string.Empty);

        var address = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == addressId && x.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("آدرس مورد نظر یافت نشد.");

        if (request.IsDefault && !address.IsDefault)
        {
            var otherDefaults = await db.CustomerAddresses.Where(x => x.UserId == userId && x.Id != addressId && x.IsDefault).ToListAsync(cancellationToken);
            foreach (var addr in otherDefaults) addr.SetDefault(false);
        }

        address.Update(
            request.Title,
            request.ReceiverName,
            userPhone,
            request.Province,
            request.City,
            request.Address,
            request.PostalCode,
            request.IsDefault);

        await db.SaveChangesAsync(cancellationToken);

        return new CustomerAddressDto(
            address.Id,
            address.Title,
            address.ReceiverName,
            address.ReceiverPhone,
            address.Province,
            address.City,
            address.Address,
            address.PostalCode,
            address.IsDefault,
            address.CreatedAt);
    }

    public async Task DeleteAddressAsync(Guid userId, Guid addressId, CancellationToken cancellationToken)
    {
        var address = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == addressId && x.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("آدرس مورد نظر یافت نشد.");

        var wasDefault = address.IsDefault;
        db.CustomerAddresses.Remove(address);
        await db.SaveChangesAsync(cancellationToken);

        if (wasDefault)
        {
            var nextDefault = await db.CustomerAddresses
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);
            if (nextDefault is not null)
            {
                nextDefault.SetDefault(true);
                await db.SaveChangesAsync(cancellationToken);
            }
        }
    }

    public async Task<CustomerAddressDto> SetDefaultAddressAsync(Guid userId, Guid addressId, CancellationToken cancellationToken)
    {
        var address = await db.CustomerAddresses.FirstOrDefaultAsync(x => x.Id == addressId && x.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("آدرس مورد نظر یافت نشد.");

        var otherDefaults = await db.CustomerAddresses.Where(x => x.UserId == userId && x.Id != addressId && x.IsDefault).ToListAsync(cancellationToken);
        foreach (var addr in otherDefaults) addr.SetDefault(false);

        address.SetDefault(true);
        await db.SaveChangesAsync(cancellationToken);

        return new CustomerAddressDto(
            address.Id,
            address.Title,
            address.ReceiverName,
            address.ReceiverPhone,
            address.Province,
            address.City,
            address.Address,
            address.PostalCode,
            address.IsDefault,
            address.CreatedAt);
    }

    public async Task<IReadOnlyList<WishlistItemDto>> GetWishlistAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.WishlistItems.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Include(x => x.Product)
                .ThenInclude(p => p.Category)
            .Include(x => x.Product)
                .ThenInclude(p => p.Media)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new WishlistItemDto(
                x.Id,
                x.ProductId,
                x.Product.Name,
                x.Product.Slug,
                x.Product.Price,
                x.Product.CompareAtPrice,
                x.Product.Media.Where(m => m.IsPrimary).Select(m => m.PublicUrl).FirstOrDefault()
                    ?? x.Product.Media.OrderBy(m => m.SortOrder).Select(m => m.PublicUrl).FirstOrDefault(),
                x.Product.StockQuantity > 0,
                x.Product.Category != null ? x.Product.Category.Name : null,
                x.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> GetWishlistProductIdsAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.WishlistItems.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.ProductId)
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ToggleWishlistAsync(Guid userId, Guid productId, CancellationToken cancellationToken)
    {
        var productExists = await db.Products.AnyAsync(x => x.Id == productId, cancellationToken);
        if (!productExists) throw new NotFoundException("محصول مورد نظر یافت نشد.");

        var existing = await db.WishlistItems.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId, cancellationToken);
        if (existing is not null)
        {
            db.WishlistItems.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
            return false; // Removed
        }

        var item = new WishlistItem(userId, productId);
        await db.WishlistItems.AddAsync(item, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        return true; // Added
    }

    public async Task RemoveFromWishlistAsync(Guid userId, Guid productId, CancellationToken cancellationToken)
    {
        var existing = await db.WishlistItems.FirstOrDefaultAsync(x => x.UserId == userId && x.ProductId == productId, cancellationToken);
        if (existing is not null)
        {
            db.WishlistItems.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
        }
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
