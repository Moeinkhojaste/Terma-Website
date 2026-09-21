using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Payments;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Payments;

public sealed class ZarinPalGatewayService(
    HttpClient httpClient,
    IOptions<ZarinPalOptions> options,
    ILogger<ZarinPalGatewayService> logger) : IPaymentGatewayService
{
    private readonly ZarinPalOptions _options = options.Value;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public async Task<PaymentInitiateResponse> RequestPaymentAsync(Order order, string callbackUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var requestUrl = _options.GetRequestUrl();
            var payload = new ZarinPalPaymentRequest(
                merchant_id: _options.MerchantId,
                amount: (long)order.Total,
                currency: _options.Currency,
                callback_url: callbackUrl,
                description: $"سفارش {order.Number} - فروشگاه ترما",
                metadata: new ZarinPalMetadata(
                    mobile: order.PhoneSnapshot,
                    email: order.EmailSnapshot
                )
            );

            logger.LogInformation("Sending ZarinPal payment request for Order {OrderNumber}, Amount: {Amount} {Currency}, Sandbox: {IsSandbox}",
                order.Number, order.Total, _options.Currency, _options.IsSandbox);

            var response = await httpClient.PostAsJsonAsync(requestUrl, payload, JsonOpts, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(responseContent);
            var root = doc.RootElement;

            if (root.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Object)
            {
                var code = dataEl.TryGetProperty("code", out var codeEl) ? codeEl.GetInt32() : 0;
                var authority = dataEl.TryGetProperty("authority", out var authEl) ? authEl.GetString() : null;

                if (code == 100 && !string.IsNullOrWhiteSpace(authority))
                {
                    var paymentUrl = _options.GetStartPayUrl(authority);
                    logger.LogInformation("ZarinPal payment token created successfully: Authority {Authority}", authority);
                    return new PaymentInitiateResponse(true, paymentUrl, authority, null);
                }
            }

            var errorCode = (int)response.StatusCode;
            string? errorMessage = null;

            if (root.TryGetProperty("errors", out var errorsEl) && errorsEl.ValueKind == JsonValueKind.Object)
            {
                if (errorsEl.TryGetProperty("code", out var errCodeEl) && errCodeEl.TryGetInt32(out var parsedCode))
                    errorCode = parsedCode;
                if (errorsEl.TryGetProperty("message", out var errMsgEl))
                    errorMessage = errMsgEl.GetString();
            }

            var errorMsg = GetFriendlyErrorMessage(errorCode, errorMessage);
            logger.LogWarning("ZarinPal payment request rejected. Code: {Code}, Message: {Message}, Raw: {Raw}", errorCode, errorMsg, responseContent);
            return new PaymentInitiateResponse(false, null, null, errorMsg);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error communicating with ZarinPal payment gateway for Order {OrderNumber}", order.Number);
            return new PaymentInitiateResponse(false, null, null, "خطا در برقراری ارتباط با درگاه پرداخت. لطفاً دوباره تلاش کنید.");
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(decimal amount, string authority, CancellationToken cancellationToken = default)
    {
        try
        {
            var verifyUrl = _options.GetVerifyUrl();
            var payload = new ZarinPalVerifyRequest(
                merchant_id: _options.MerchantId,
                amount: (long)amount,
                authority: authority
            );

            logger.LogInformation("Sending ZarinPal verify request for Authority: {Authority}, Amount: {Amount}", authority, amount);

            var response = await httpClient.PostAsJsonAsync(verifyUrl, payload, JsonOpts, cancellationToken);
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(responseContent);
            var root = doc.RootElement;

            if (root.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Object)
            {
                var code = dataEl.TryGetProperty("code", out var codeEl) ? codeEl.GetInt32() : 0;
                if (code == 100 || code == 101)
                {
                    long refId = dataEl.TryGetProperty("ref_id", out var refEl) && refEl.TryGetInt64(out var parsedRef) ? parsedRef : 0;
                    string? cardPan = dataEl.TryGetProperty("card_pan", out var panEl) ? panEl.GetString() : null;
                    string? cardHash = dataEl.TryGetProperty("card_hash", out var hashEl) ? hashEl.GetString() : null;

                    logger.LogInformation("ZarinPal verification succeeded for Authority: {Authority}, RefId: {RefId}, Code: {Code}",
                        authority, refId, code);

                    return new PaymentVerificationResult(
                        Success: true,
                        RefId: refId,
                        CardPan: cardPan,
                        CardHash: cardHash,
                        Code: code,
                        ErrorMessage: null
                    );
                }
            }

            var errorCode = (int)response.StatusCode;
            string? errorMessage = null;

            if (root.TryGetProperty("errors", out var errorsEl) && errorsEl.ValueKind == JsonValueKind.Object)
            {
                if (errorsEl.TryGetProperty("code", out var errCodeEl) && errCodeEl.TryGetInt32(out var parsedCode))
                    errorCode = parsedCode;
                if (errorsEl.TryGetProperty("message", out var errMsgEl))
                    errorMessage = errMsgEl.GetString();
            }

            var errorMsg = GetFriendlyErrorMessage(errorCode, errorMessage);
            logger.LogWarning("ZarinPal verification failed for Authority: {Authority}. Code: {Code}, Message: {Message}",
                authority, errorCode, errorMsg);

            return new PaymentVerificationResult(
                Success: false,
                RefId: null,
                CardPan: null,
                CardHash: null,
                Code: errorCode,
                ErrorMessage: errorMsg
            );
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error verifying ZarinPal payment for Authority: {Authority}", authority);
            return new PaymentVerificationResult(false, null, null, null, null, "خطا در تایید تراکنش درگاه پرداخت.");
        }
    }

    private static string GetFriendlyErrorMessage(int code, string? gatewayMessage)
    {
        return code switch
        {
            -9 => "اطلاعات ارسالی نامعتبر است (شناسه مرچنت یا آدرس بازگشت صحیح نیست).",
            -10 => "آی‌پی یا مرچنت کد پذیرنده در درگاه زرین‌پال تایید نشده است.",
            -11 => "مرچنت درگاه در وضعیت فعال قرار ندارد.",
            -12 => "تلاش بیش از حد مجاز؛ لطفاً چند لحظه بعد تلاش کنید.",
            -15 => "درگاه پرداخت در حال حاضر در دسترس نیست.",
            -16 => "سطح دسترسی پذیرنده مجاز به انجام این تراکنش نیست.",
            -31 => "حساب بانکی جهت تسویه در درگاه تعریف نشده است.",
            -32 => "مبلغ تراکنش خارج از محدوده مجاز درگاه است.",
            -50 => "مبلغ پرداخت شده با مبلغ سفارش مغایرت دارد.",
            -51 => "پرداخت ناموفق بود یا توسط کاربر لغو شده است.",
            -52 => "خطای غیرمنتظره در درگاه بانکی رخ داد.",
            -53 => "شناسه پرداخت (Authority) نامعتبر است.",
            -54 => "مهلت پرداخت منقضی شده است.",
            101 => "تراکنش قبلاً با موفقیت تایید شده است.",
            _ => string.IsNullOrWhiteSpace(gatewayMessage)
                ? "پرداخت در درگاه بانکی انجام نشد یا لغو گردید."
                : gatewayMessage
        };
    }

    private sealed record ZarinPalPaymentRequest(
        string merchant_id,
        long amount,
        string currency,
        string callback_url,
        string description,
        ZarinPalMetadata metadata);

    private sealed record ZarinPalMetadata(string? mobile, string? email);

    private sealed record ZarinPalVerifyRequest(
        string merchant_id,
        long amount,
        string authority);
}
