using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Interfaces;
using Terma.Application.Payments;
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
    ILogger<PaymentController> logger) : ControllerBase
{
    [HttpPost("initiate")]
    [EnableRateLimiting("order-create")]
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
            await db.SaveChangesAsync(ct);

            await auditService.LogAsync(
                order.PhoneSnapshot,
                "PaymentVerify",
                order.Number,
                "Success",
                HttpContext.TraceIdentifier,
                GetClientIp(),
                ct);

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
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
