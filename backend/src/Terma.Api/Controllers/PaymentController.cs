using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Interfaces;
using Terma.Application.Payments;
using Terma.Application.Telegram;
using Terma.Domain.Entities;
using Terma.Domain.Exceptions;
using Terma.Infrastructure.Persistence;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/payment")]
public sealed class PaymentController(
    TermaDbContext db,
    IPaymentGatewayService paymentGatewayService,
    IOptions<ZarinPalOptions> zarinPalOptions,
    ISecurityAuditService auditService,
    IConfiguration configuration,
    ILogger<PaymentController> logger,
    ITelegramBotService? telegramBotService = null) : ControllerBase
{
    [HttpPost("initiate")]
    [EnableRateLimiting("payment-initiate")]
    [ValidateApiAntiforgeryToken(RequireAuthenticatedOnly = true)]
    public async Task<IActionResult> Initiate([FromBody] PaymentInitiateRequest request, CancellationToken ct)
    {
        if (request.OrderId == Guid.Empty)
            return BadRequest(new { error = "شناسه سفارش معتبر نیست." });

        var order = await db.Orders.SingleOrDefaultAsync(x => x.Id == request.OrderId, ct);
        if (order is null)
            return NotFound(new { error = "سفارش مورد نظر یافت نشد." });

        if (order.Status == OrderStatus.Confirmed || order.Status == OrderStatus.Preparing ||
            order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Delivered)
        {
            return BadRequest(new { error = "این سفارش قبلاً پرداخت و تایید شده است." });
        }

        if (order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.Expired)
        {
            return BadRequest(new { error = "مهلت پرداخت این سفارش به پایان رسیده یا لغو شده است." });
        }

        var callbackUrl = ResolveCallbackUrl();

        var initiateResult = await paymentGatewayService.RequestPaymentAsync(order, callbackUrl, ct);
        if (!initiateResult.Success || string.IsNullOrWhiteSpace(initiateResult.Authority))
        {
            logger.LogWarning("Failed to initiate payment for Order {OrderNumber}: {Error}", order.Number, initiateResult.ErrorMessage);
            return BadRequest(new { error = initiateResult.ErrorMessage ?? "خطا در اتصال به درگاه پرداخت." });
        }

        var transaction = new PaymentTransaction(
            orderId: order.Id,
            amount: order.Total,
            authority: initiateResult.Authority,
            gateway: "ZarinPal",
            currency: zarinPalOptions.Value.Currency
        );

        order.AddPayment(transaction);
        await db.PaymentTransactions.AddAsync(transaction, ct);
        await db.SaveChangesAsync(ct);

        await auditService.LogAsync(
            order.PhoneSnapshot,
            "PaymentInitiate",
            order.Number,
            "Success",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            ct);

        return Ok(new
        {
            success = true,
            paymentUrl = initiateResult.PaymentUrl,
            authority = initiateResult.Authority
        });
    }

    [HttpGet("zarinpal/callback")]
    public async Task<IActionResult> ZarinPalCallback(
        [FromQuery(Name = "Authority")] string? authority,
        [FromQuery(Name = "Status")] string? status,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(authority))
        {
            logger.LogWarning("ZarinPal callback invoked without Authority token.");
            return Redirect(BuildStorefrontUrl("/order/failed", [("message", "شناسه تراکنش دریافت نشد.")]));
        }

        var cleanAuthority = authority.Trim();
        var transaction = await db.PaymentTransactions
            .Include(x => x.Order)
                .ThenInclude(o => o.Items)
            .SingleOrDefaultAsync(x => x.Authority == cleanAuthority, ct);

        if (transaction is null)
        {
            logger.LogWarning("Payment transaction with Authority {Authority} not found.", cleanAuthority);
            return Redirect(BuildStorefrontUrl("/order/failed", [("message", "اطلاعات تراکنش در سامانه یافت نشد.")]));
        }

        var order = transaction.Order;

        // If user cancelled on gateway
        if (string.Equals(status, "NOK", StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogInformation("Payment was cancelled or rejected by user for Order {OrderNumber}, Authority {Authority}",
                order.Number, cleanAuthority);

            transaction.MarkCancelled();
            if (order.Status == OrderStatus.PendingConfirmation)
            {
                order.ChangeStatus(OrderStatus.Cancelled);
                await db.OrderStatusHistories.AddAsync(new OrderStatusHistory(order.Id, OrderStatus.Cancelled, DateTime.UtcNow), ct);
                await ReleaseOrderStockAsync(order, ct);
            }
            await db.SaveChangesAsync(ct);

            await auditService.LogAsync(
                order.PhoneSnapshot,
                "PaymentCancelled",
                order.Number,
                "Failed",
                HttpContext.TraceIdentifier,
                GetClientIp(),
                ct);

            return Redirect(BuildStorefrontUrl("/order/cancelled", [("order", order.Number)]));
        }

        // Verify transaction with ZarinPal
        var verifyResult = await paymentGatewayService.VerifyPaymentAsync(transaction.Amount, cleanAuthority, ct);

        if (verifyResult.Success && verifyResult.RefId.HasValue)
        {
            logger.LogInformation("Payment verified successfully for Order {OrderNumber}, RefId: {RefId}",
                order.Number, verifyResult.RefId.Value);

            transaction.MarkVerified(verifyResult.RefId.Value, verifyResult.CardPan, verifyResult.CardHash);
            order.ConfirmPayment(verifyResult.RefId.Value);
            await db.OrderStatusHistories.AddAsync(new OrderStatusHistory(order.Id, OrderStatus.Confirmed, DateTime.UtcNow), ct);
            await CommitOrderStockAsync(order, ct);
            await db.SaveChangesAsync(ct);

            await auditService.LogAsync(
                order.PhoneSnapshot,
                "PaymentVerify",
                order.Number,
                "Success",
                HttpContext.TraceIdentifier,
                GetClientIp(),
                ct);

            SendOrderTelegramNotification(order);

            return Redirect(BuildStorefrontUrl("/order/success", [
                ("order", order.Number),
                ("refId", verifyResult.RefId.Value.ToString())
            ]));
        }

        // Verification failed
        var failureMsg = verifyResult.ErrorMessage ?? "پرداخت توسط بانک تایید نشد.";
        logger.LogWarning("Payment verification failed for Order {OrderNumber}, Authority {Authority}: {Error}",
            order.Number, cleanAuthority, failureMsg);

        transaction.MarkFailed(failureMsg);
        if (order.Status == OrderStatus.PendingConfirmation)
        {
            order.ChangeStatus(OrderStatus.Cancelled);
            await db.OrderStatusHistories.AddAsync(new OrderStatusHistory(order.Id, OrderStatus.Cancelled, DateTime.UtcNow), ct);
            await ReleaseOrderStockAsync(order, ct);
        }
        await db.SaveChangesAsync(ct);

        await auditService.LogAsync(
            order.PhoneSnapshot,
            "PaymentVerifyFailed",
            order.Number,
            "Failed",
            HttpContext.TraceIdentifier,
            GetClientIp(),
            ct);

        return Redirect(BuildStorefrontUrl("/order/failed", [
            ("order", order.Number),
            ("message", failureMsg)
        ]));
    }

    private async Task ReleaseOrderStockAsync(Order order, CancellationToken ct)
    {
        foreach (var item in order.Items)
        {
            if (item.VariantId.HasValue)
            {
                var variant = await db.ProductVariants.SingleOrDefaultAsync(v => v.Id == item.VariantId.Value, ct);
                if (variant is not null)
                {
                    var releaseQty = Math.Min(variant.ReservedQuantity, item.Quantity);
                    if (releaseQty > 0)
                    {
                        variant.ReleaseReservation(releaseQty);
                    }
                }
            }

            var product = await db.Products.SingleOrDefaultAsync(p => p.Id == item.ProductId, ct);
            if (product is not null)
            {
                product.AdjustStock(item.Quantity);
            }
        }
    }

    private async Task CommitOrderStockAsync(Order order, CancellationToken ct)
    {
        foreach (var item in order.Items)
        {
            if (item.VariantId.HasValue)
            {
                var variant = await db.ProductVariants.SingleOrDefaultAsync(v => v.Id == item.VariantId.Value, ct);
                if (variant is not null)
                {
                    var commitQty = Math.Min(variant.ReservedQuantity, item.Quantity);
                    if (commitQty > 0)
                    {
                        variant.CommitReservation(commitQty);
                    }
                    var remaining = item.Quantity - commitQty;
                    if (remaining > 0)
                    {
                        var deduct = Math.Min(variant.AvailableQuantity, remaining);
                        if (deduct > 0)
                        {
                            variant.AdjustStock(-deduct);
                        }
                    }
                }
            }
        }
    }

    private void SendOrderTelegramNotification(Order order)
    {
        if (telegramBotService is null) return;

        var variantIds = order.Items.Where(i => i.VariantId.HasValue).Select(i => i.VariantId!.Value).Distinct().ToList();
        var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
        var variants = variantIds.Count == 0 ? new Dictionary<Guid, ProductVariant>() : db.ProductVariants.AsNoTracking().Where(x => variantIds.Contains(x.Id)).ToDictionary(x => x.Id);
        var products = productIds.Count == 0 ? new Dictionary<Guid, Product>() : db.Products.AsNoTracking().Where(x => productIds.Contains(x.Id)).ToDictionary(x => x.Id);

        var notificationDto = new OrderNotificationDto(
            order.Id,
            order.Number,
            order.FullNameSnapshot,
            order.PhoneSnapshot,
            order.EmailSnapshot,
            order.Province,
            order.City,
            order.Address,
            order.PostalCode,
            order.CustomerNotes,
            order.Subtotal,
            order.DiscountTotal,
            order.ShippingTotal,
            order.Total,
            order.Items.Select(item =>
            {
                variants.TryGetValue(item.VariantId ?? Guid.Empty, out var variant);
                products.TryGetValue(item.ProductId, out var product);
                return new OrderNotificationItemDto(
                    item.ProductId,
                    item.VariantId,
                    item.ProductName,
                    item.Sku,
                    variant?.Title,
                    variant?.Color,
                    (variant?.TableCapacity > 0 ? variant.TableCapacity : product?.TableCapacity),
                    (variant?.Length > 0 ? variant.Length : product?.Length),
                    (variant?.Width > 0 ? variant.Width : product?.Width),
                    product?.FabricType,
                    product?.LiningType,
                    product?.Pattern,
                    item.UnitPrice,
                    item.Quantity
                );
            }).ToList(),
            order.CreatedAt
        );

        _ = Task.Run(async () =>
        {
            try
            {
                await telegramBotService.NotifyNewOrderAsync(notificationDto, CancellationToken.None);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background Telegram notification failed for verified order {OrderNumber}", order.Number);
            }
        });
    }

    private string ResolveCallbackUrl()
    {
        var configured = zarinPalOptions.Value.CallbackUrl?.Trim();
        if (!string.IsNullOrWhiteSpace(configured) && configured.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            return configured;
        }

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
        return $"{scheme}://{host}/api/payment/zarinpal/callback";
    }

    private string BuildStorefrontUrl(string path, IEnumerable<(string Key, string Value)>? queryParams = null)
    {
        var baseUrl = ResolveStorefrontBaseUrl();
        var uriBuilder = new UriBuilder($"{baseUrl.TrimEnd('/')}{path}");

        if (queryParams != null)
        {
            var query = new List<string>();
            foreach (var (k, v) in queryParams)
            {
                if (!string.IsNullOrWhiteSpace(k) && !string.IsNullOrWhiteSpace(v))
                {
                    query.Add($"{Uri.EscapeDataString(k)}={Uri.EscapeDataString(v)}");
                }
            }
            if (query.Count > 0)
            {
                uriBuilder.Query = string.Join("&", query);
            }
        }

        return uriBuilder.Uri.ToString();
    }

    private string ResolveStorefrontBaseUrl()
    {
        var configuredFrontend = configuration["Frontend:BaseUrl"]?.Trim();
        if (!string.IsNullOrWhiteSpace(configuredFrontend))
        {
            return configuredFrontend.TrimEnd('/');
        }

        var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault() ?? Request.Host.Value;
        if (host.StartsWith("localhost", StringComparison.OrdinalIgnoreCase) ||
            host.StartsWith("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            return "http://localhost:3000";
        }

        var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
        return $"{scheme}://{host}".TrimEnd('/');
    }

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            var ip = forwarded.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(ip)) return ip;
        }

        var realIp = HttpContext.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(realIp)) return realIp.Trim();

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
