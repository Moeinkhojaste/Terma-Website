using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Payments;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Payments;

public sealed class TorobPayGatewayService(
    HttpClient httpClient,
    IOptions<TorobPayOptions> options,
    ILogger<TorobPayGatewayService> logger) : ITorobPayGatewayService
{
    private readonly TorobPayOptions _options = options.Value;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private string? _cachedAccessToken;
    private DateTime _tokenExpiresAtUtc = DateTime.MinValue;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);

    private async Task<(string? Token, string? ErrorMessage)> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.ClientId) || string.IsNullOrWhiteSpace(_options.ClientSecret))
        {
            const string error = "تنظیمات اتصال به درگاه ترب‌پی (شناسه یا کلید دسترسی) در سرور مقداردهی نشده است.";
            logger.LogWarning("TorobPay ClientId or ClientSecret is not configured in settings.");
            return (null, error);
        }

        if (!string.IsNullOrWhiteSpace(_cachedAccessToken) && DateTime.UtcNow < _tokenExpiresAtUtc)
        {
            return (_cachedAccessToken, null);
        }

        await _tokenLock.WaitAsync(cancellationToken);
        try
        {
            if (!string.IsNullOrWhiteSpace(_cachedAccessToken) && DateTime.UtcNow < _tokenExpiresAtUtc)
            {
                return (_cachedAccessToken, null);
            }

            var tokenUrl = _options.GetTokenUrl();
            var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.ClientId}:{_options.ClientSecret}"));

            using var req = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            req.Content = JsonContent.Create(new
            {
                username = _options.Username,
                password = _options.Password
            });

            logger.LogInformation("Requesting TorobPay OAuth token for ClientId: {ClientId}", _options.ClientId);
            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            if (!res.IsSuccessStatusCode)
            {
                logger.LogWarning("Failed to retrieve TorobPay OAuth token. Status: {StatusCode}, Response: {Response}", res.StatusCode, content);
                var error = $"خطا در احراز هویت با سرویس ترب‌پی (کد {(int)res.StatusCode}).";
                try
                {
                    using var docErr = JsonDocument.Parse(content);
                    var detail = ExtractErrorMessage(docErr.RootElement);
                    if (!string.IsNullOrWhiteSpace(detail))
                    {
                        error = $"خطا در احراز هویت با سرویس ترب‌پی: {detail}";
                    }
                }
                catch { }
                return (null, error);
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            if (root.TryGetProperty("access_token", out var tokenProp))
            {
                var token = tokenProp.GetString();
                if (!string.IsNullOrWhiteSpace(token))
                {
                    _cachedAccessToken = token;
                    // Token is valid for 1 hour per Torob Pay docs; cache for 50 minutes to refresh before expiry
                    _tokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(50);
                    logger.LogInformation("TorobPay OAuth access token acquired successfully.");
                    return (_cachedAccessToken, null);
                }
            }

            logger.LogWarning("Failed to retrieve TorobPay OAuth token. Response: {Response}", content);
            return (null, "پاسخ نامعتبر از سرویس احراز هویت ترب‌پی.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Exception while requesting TorobPay OAuth token.");
            return (null, $"خطا در اتصال به سرور ترب‌پی: {ex.Message}");
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    public async Task<TorobEligibilityDto> CheckEligibilityAsync(decimal amountInTomans, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            return new TorobEligibilityDto(false, "درگاه خرید اعتباری ترب‌پی در حال حاضر غیرفعال است.", null);
        }

        var amountInRials = (long)(amountInTomans * 10);
        if (amountInRials < 200_000)
        {
            return new TorobEligibilityDto(false, "حداقل مبلغ خرید اعتباری ترب‌پی ۲۰٬۰۰۰ تومان است.", null);
        }

        if (amountInRials > 1_000_000_000)
        {
            return new TorobEligibilityDto(false, "حداکثر مبلغ خرید اعتباری ترب‌پی ۱۰۰٬۰۰۰٬۰۰۰ تومان است.", null);
        }

        var (token, tokenError) = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new TorobEligibilityDto(false, tokenError ?? "عدم برقراری ارتباط با سرویس ترب‌پی.", null);
        }

        try
        {
            var url = _options.GetEligibleUrl(amountInRials);
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            if (successful && root.TryGetProperty("response", out var respProp))
            {
                var eligible = respProp.TryGetProperty("eligible", out var elProp) && elProp.GetBoolean();
                var title = respProp.TryGetProperty("title_message", out var titleProp) ? titleProp.GetString() : "پرداخت اقساطی با ترب‌پی";
                var description = respProp.TryGetProperty("description", out var descProp) ? descProp.GetString() : "دریافت اعتبار و خرید در ۴ قسط";

                return new TorobEligibilityDto(eligible, title, description);
            }

            var errMsg = ExtractErrorMessage(root) ?? "عدم احراز صلاحیت برای خرید اعتباری ترب‌پی.";
            logger.LogWarning("TorobPay eligibility check returned unsuccessful. Message: {Message}, Raw: {Raw}", errMsg, content);
            return new TorobEligibilityDto(false, errMsg, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error checking TorobPay eligibility.");
            return new TorobEligibilityDto(false, "خطا در استعلام صلاحیت خرید اعتباری ترب‌پی.", null);
        }
    }

    public async Task<PaymentInitiateResponse> RequestPaymentAsync(Order order, string callbackUrl, CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            return new PaymentInitiateResponse(false, null, null, "درگاه خرید اعتباری ترب‌پی در حال حاضر غیرفعال است.");
        }

        var (token, tokenError) = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new PaymentInitiateResponse(false, null, null, tokenError ?? "خطا در احراز هویت با سرویس ترب‌پی.");
        }

        try
        {
            var amountInRials = (long)(order.Total * 10);
            var discountInRials = (long)(order.DiscountTotal * 10);
            var shippingInRials = (long)(order.ShippingTotal * 10);

            var cartItems = order.Items.Select(item => new
            {
                id = item.ProductId.ToString(),
                name = item.ProductName,
                count = item.Quantity,
                amount = (long)(item.UnitPrice * 10),
                category = "منسوجات و ترمه",
                commissionType = 0
            }).ToList();

            var cartList = new[]
            {
                new
                {
                    cartId = order.Number,
                    totalAmount = amountInRials,
                    taxAmount = 0L,
                    shippingAmount = shippingInRials,
                    isTaxIncluded = false,
                    isShipmentIncluded = shippingInRials > 0,
                    cartItems = cartItems
                }
            };

            var payload = new
            {
                amount = amountInRials,
                discountAmount = discountInRials,
                externalSourceAmount = 0L,
                mobile = order.PhoneSnapshot,
                paymentMethodTypeDto = "ONLINE_CREDIT",
                returnURL = callbackUrl,
                transactionId = order.Id.ToString("N"),
                cartList = cartList,
                address = order.Address,
                postalCode = order.PostalCode,
                customer_full_name = order.FullNameSnapshot,
                city = order.City,
                province = order.Province,
                registration_phone_number = order.PhoneSnapshot
            };

            var url = _options.GetPaymentTokenUrl();
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Content = JsonContent.Create(payload, options: JsonOpts);

            logger.LogInformation("Sending TorobPay payment token request for Order {OrderNumber}, Amount: {Amount} Rials",
                order.Number, amountInRials);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            if (successful && root.TryGetProperty("response", out var respProp))
            {
                var paymentToken = respProp.TryGetProperty("paymentToken", out var ptProp) ? ptProp.GetString() : null;
                var paymentPageUrl = respProp.TryGetProperty("paymentPageUrl", out var urlProp) ? urlProp.GetString() : null;

                if (!string.IsNullOrWhiteSpace(paymentToken) && !string.IsNullOrWhiteSpace(paymentPageUrl))
                {
                    logger.LogInformation("TorobPay payment token issued successfully for Order {OrderNumber}: {Token}",
                        order.Number, paymentToken);
                    return new PaymentInitiateResponse(true, paymentPageUrl, paymentToken, null);
                }
            }

            var errorMsg = ExtractErrorMessage(root) ?? "خطا در دریافت توکن پرداخت ترب‌پی.";
            logger.LogWarning("TorobPay payment token request failed for Order {OrderNumber}: {Error}, Raw: {Raw}",
                order.Number, errorMsg, content);

            return new PaymentInitiateResponse(false, null, null, errorMsg);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error communicating with TorobPay for Order {OrderNumber}", order.Number);
            return new PaymentInitiateResponse(false, null, null, "خطا در برقراری ارتباط با درگاه اعتباری ترب‌پی. لطفاً دوباره تلاش کنید.");
        }
    }

    public async Task<PaymentVerificationResult> VerifyPaymentAsync(string paymentToken, CancellationToken cancellationToken = default)
    {
        var (token, tokenError) = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new PaymentVerificationResult(false, null, null, null, 401, tokenError ?? "خطا در احراز هویت با سرویس ترب‌پی.");
        }

        try
        {
            var url = _options.GetVerifyUrl();
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Content = JsonContent.Create(new { paymentToken }, options: JsonOpts);

            logger.LogInformation("Sending TorobPay verify request for PaymentToken: {PaymentToken}", paymentToken);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            if (successful)
            {
                // Generate tracking ref id from current timestamp
                var refId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                logger.LogInformation("TorobPay verify succeeded for PaymentToken: {PaymentToken}, RefId: {RefId}",
                    paymentToken, refId);

                return new PaymentVerificationResult(
                    Success: true,
                    RefId: refId,
                    CardPan: null,
                    CardHash: null,
                    Code: 200,
                    ErrorMessage: null
                );
            }

            var errorMsg = ExtractErrorMessage(root) ?? "تأیید پرداخت توسط درگاه ترب‌پی انجام نشد.";
            logger.LogWarning("TorobPay verify rejected for PaymentToken: {PaymentToken}. Error: {Error}, Raw: {Raw}",
                paymentToken, errorMsg, content);

            return new PaymentVerificationResult(false, null, null, null, (int)res.StatusCode, errorMsg);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error verifying TorobPay payment for token {PaymentToken}", paymentToken);
            return new PaymentVerificationResult(false, null, null, null, 500, "خطای غیرمنتظره در تأیید پرداخت ترب‌پی.");
        }
    }

    public async Task<bool> SettlePaymentAsync(string paymentToken, CancellationToken cancellationToken = default)
    {
        var (token, _) = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Cannot settle TorobPay: failed to acquire access token.");
            return false;
        }

        try
        {
            var url = _options.GetSettleUrl();
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Content = JsonContent.Create(new { paymentToken }, options: JsonOpts);

            logger.LogInformation("Sending TorobPay settle request for PaymentToken: {PaymentToken}", paymentToken);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            if (successful)
            {
                logger.LogInformation("TorobPay payment settled successfully for PaymentToken: {PaymentToken}", paymentToken);
                return true;
            }

            logger.LogWarning("TorobPay settle returned unsuccessful: {Raw}", content);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error settling TorobPay payment for token {PaymentToken}", paymentToken);
            return false;
        }
    }

    public async Task<bool> RevertPaymentAsync(string paymentToken, CancellationToken cancellationToken = default)
    {
        var (token, _) = await GetAccessTokenAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token))
        {
            logger.LogWarning("Cannot revert TorobPay: failed to acquire access token.");
            return false;
        }

        try
        {
            var url = _options.GetRevertUrl();
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
            req.Content = JsonContent.Create(new { paymentToken }, options: JsonOpts);

            logger.LogInformation("Sending TorobPay revert request for PaymentToken: {PaymentToken}", paymentToken);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            return successful;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error reverting TorobPay payment for token {PaymentToken}", paymentToken);
            return false;
        }
    }

    private static string? ExtractErrorMessage(JsonElement root)
    {
        if (root.TryGetProperty("error", out var errProp) && errProp.ValueKind == JsonValueKind.Object)
        {
            if (errProp.TryGetProperty("user_message", out var userMsg) && !string.IsNullOrWhiteSpace(userMsg.GetString()))
            {
                return userMsg.GetString();
            }

            if (errProp.TryGetProperty("message", out var msg) && !string.IsNullOrWhiteSpace(msg.GetString()))
            {
                var m = msg.GetString()!;
                return MapFriendlyMessage(m);
            }

            if (errProp.TryGetProperty("code", out var codeProp) && codeProp.TryGetInt32(out var code))
            {
                return MapCodeToFriendlyMessage(code);
            }
        }

        return null;
    }

    private static string MapFriendlyMessage(string rawMessage) => rawMessage.ToLowerInvariant() switch
    {
        "merchant is not authenticated" => "احراز هویت فروشگاه انجام نشد.",
        "merchant inactive" => "پذیرنده درگاه ترب‌پی غیرفعال است.",
        "invalid token" => "توکن پرداخت نامعتبر است.",
        "no order" => "سفارشی برای این تراکنش یافت نشد.",
        "invalid order state" => "وضعیت سفارش برای این عملیات معتبر نیست.",
        "not matching token and order" => "توکن پرداخت با سفارش همخوانی ندارد.",
        "invalid amount" => "مبلغ تراکنش خارج از محدوده مجاز درگاه است.",
        _ => rawMessage
    };

    private static string MapCodeToFriendlyMessage(int code) => code switch
    {
        1000 => "خطای احراز هویت درگاه ترب‌پی.",
        1003 => "داده‌های ورودی سفارش معتبر نیستند.",
        1005 => "توکن ارائه شده معتبر نیست.",
        1007 => "سفارشی با این توکن یافت نشد.",
        1011 => "مبلغ تراکنش نامعتبر است.",
        1048 => "توکن به سفارش مربوط به این پذیرنده تعلق ندارد.",
        1053 => "وضعیت سفارش نامعتبر است.",
        1065 => "مهلت ۳۰ دقیقه‌ای لغو سفارش به پایان رسیده است.",
        1099 => "پذیرنده درگاه ترب‌پی غیرفعال یا مسدود است.",
        _ => $"خطای درگاه پرداخت ترب‌پی (کد {code})"
    };
}
