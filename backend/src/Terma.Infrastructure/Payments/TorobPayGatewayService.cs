using System.Net;
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
        var clientId = _options.ResolvedClientId;
        var clientSecret = _options.ResolvedClientSecret;
        var username = _options.ResolvedUsername;
        var password = _options.ResolvedPassword;

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) ||
            string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
        {
            const string error = "تنظیمات اتصال به درگاه ترب‌پی (شناسه یا کلید دسترسی) در سرور مقداردهی نشده است.";
            logger.LogWarning("TorobPay ClientId, ClientSecret, Username, or Password is not configured in settings.");
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
            var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{clientId}:{clientSecret}"));

            logger.LogInformation("Requesting TorobPay OAuth token for ClientId: {ClientId}, Username: {Username} at {Url}",
                clientId, username, tokenUrl);

            using var req = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
            req.Headers.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Content = JsonContent.Create(new
            {
                username,
                password
            });

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
                    var expiresInSec = root.TryGetProperty("expires_in", out var expProp) && expProp.TryGetInt32(out var exp) ? exp : 3600;
                    _tokenExpiresAtUtc = DateTime.UtcNow.AddSeconds(Math.Max(60, expiresInSec - 300));
                    logger.LogInformation("TorobPay OAuth access token acquired successfully. Expires in {Sec}s.", expiresInSec);
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
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

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
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Content = JsonContent.Create(payload, options: JsonOpts);

            logger.LogInformation("Sending TorobPay payment token request for Order {OrderNumber}, Amount: {Amount} Rials",
                order.Number, amountInRials);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            if (res.StatusCode == HttpStatusCode.Unauthorized)
            {
                logger.LogWarning("TorobPay payment token request returned 401. Refreshing access token and retrying...");
                _cachedAccessToken = null;
                var (freshToken, retryError) = await GetAccessTokenAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(freshToken))
                {
                    return new PaymentInitiateResponse(false, null, null, retryError ?? "خطا در احراز هویت با سرویس ترب‌پی.");
                }

                using var retryReq = new HttpRequestMessage(HttpMethod.Post, url);
                retryReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", freshToken);
                retryReq.Headers.Accept.Clear();
                retryReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                retryReq.Content = JsonContent.Create(payload, options: JsonOpts);

                res = await httpClient.SendAsync(retryReq, cancellationToken);
                content = await res.Content.ReadAsStringAsync(cancellationToken);
            }

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
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            req.Content = JsonContent.Create(new { paymentToken }, options: JsonOpts);

            logger.LogInformation("Sending TorobPay verify request for PaymentToken: {PaymentToken}", paymentToken);

            var res = await httpClient.SendAsync(req, cancellationToken);
            var content = await res.Content.ReadAsStringAsync(cancellationToken);

            if (res.StatusCode == HttpStatusCode.Unauthorized)
            {
                logger.LogWarning("TorobPay verify returned 401. Refreshing access token and retrying...");
                _cachedAccessToken = null;
                var (freshToken, retryError) = await GetAccessTokenAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(freshToken))
                {
                    return new PaymentVerificationResult(false, null, null, null, 401, retryError ?? "خطا در احراز هویت با سرویس ترب‌پی.");
                }

                using var retryReq = new HttpRequestMessage(HttpMethod.Post, url);
                retryReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", freshToken);
                retryReq.Headers.Accept.Clear();
                retryReq.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
                retryReq.Content = JsonContent.Create(new { paymentToken }, options: JsonOpts);

                res = await httpClient.SendAsync(retryReq, cancellationToken);
                content = await res.Content.ReadAsStringAsync(cancellationToken);
            }

            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var successful = root.TryGetProperty("successful", out var succProp) && succProp.GetBoolean();
            if (successful)
            {
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
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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
            req.Headers.Accept.Clear();
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
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
        // 1. Check "errorData" (returned by TorobPay OAuth and payment endpoints)
        if (root.TryGetProperty("errorData", out var errData) && errData.ValueKind == JsonValueKind.Object)
        {
            var msg = ExtractMessageFromObject(errData);
            if (!string.IsNullOrWhiteSpace(msg))
            {
                return msg;
            }
        }

        // 2. Check "error" (standard object or string)
        if (root.TryGetProperty("error", out var errProp))
        {
            if (errProp.ValueKind == JsonValueKind.Object)
            {
                var msg = ExtractMessageFromObject(errProp);
                if (!string.IsNullOrWhiteSpace(msg))
                {
                    return msg;
                }
            }
            else if (errProp.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(errProp.GetString()))
            {
                return MapFriendlyMessage(errProp.GetString()!);
            }
        }

        // 3. Check root-level user_message
        if (root.TryGetProperty("user_message", out var rootUserMsg) &&
            rootUserMsg.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(rootUserMsg.GetString()))
        {
            return rootUserMsg.GetString();
        }

        // 4. Check root-level message
        if (root.TryGetProperty("message", out var rootMsg) &&
            rootMsg.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(rootMsg.GetString()))
        {
            return MapFriendlyMessage(rootMsg.GetString()!);
        }

        // 5. Check root-level detail (e.g. Django/DRF style errors)
        if (root.TryGetProperty("detail", out var rootDetail) &&
            rootDetail.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(rootDetail.GetString()))
        {
            return MapFriendlyMessage(rootDetail.GetString()!);
        }

        return null;
    }

    private static string? ExtractMessageFromObject(JsonElement obj)
    {
        if (obj.TryGetProperty("user_message", out var userMsg) &&
            userMsg.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(userMsg.GetString()))
        {
            return userMsg.GetString();
        }

        if (obj.TryGetProperty("message", out var msg) &&
            msg.ValueKind == JsonValueKind.String &&
            !string.IsNullOrWhiteSpace(msg.GetString()))
        {
            var m = msg.GetString()!;
            var friendly = MapFriendlyMessage(m);
            if (!string.IsNullOrWhiteSpace(friendly))
            {
                return friendly;
            }
        }

        if (obj.TryGetProperty("errorCode", out var errCodeProp))
        {
            if (errCodeProp.ValueKind == JsonValueKind.String && int.TryParse(errCodeProp.GetString(), out var codeStr))
            {
                return MapCodeToFriendlyMessage(codeStr);
            }
            if (errCodeProp.ValueKind == JsonValueKind.Number && errCodeProp.TryGetInt32(out var codeNum))
            {
                return MapCodeToFriendlyMessage(codeNum);
            }
        }

        if (obj.TryGetProperty("code", out var codeProp))
        {
            if (codeProp.ValueKind == JsonValueKind.Number && codeProp.TryGetInt32(out var codeNum))
            {
                return MapCodeToFriendlyMessage(codeNum);
            }
            if (codeProp.ValueKind == JsonValueKind.String && int.TryParse(codeProp.GetString(), out var codeStr))
            {
                return MapCodeToFriendlyMessage(codeStr);
            }
        }

        return null;
    }

    private static string MapFriendlyMessage(string rawMessage)
    {
        var normalized = rawMessage.Trim().TrimEnd('.').ToLowerInvariant();
        return normalized switch
        {
            "merchant is not authenticated" => "احراز هویت فروشگاه انجام نشد.",
            "merchant inactive" => "پذیرنده درگاه ترب‌پی غیرفعال است.",
            "invalid token" => "توکن پرداخت نامعتبر است.",
            "no order" => "سفارشی برای این تراکنش یافت نشد.",
            "invalid order state" => "وضعیت سفارش برای این عملیات معتبر نیست.",
            "not matching token and order" => "توکن پرداخت با سفارش همخوانی ندارد.",
            "invalid amount" => "مبلغ تراکنش خارج از محدوده مجاز درگاه است.",
            "invalid basic header" => "اطلاعات هدر احراز هویت ترب‌پی معتبر نیست.",
            "invalid basic header format" => "فرمت اطلاعات هدر احراز هویت ترب‌پی اشتباه است.",
            "invalid basic header, no merchant" => "فروشگاهی با این مشخصات در ترب‌پی یافت نشد.",
            "no username or password" => "نام کاربری یا رمز عبور ترب‌پی ارسال نشده است.",
            "invalid username or password" => "نام کاربری یا رمز عبور درگاه ترب‌پی اشتباه است.",
            "too late for revert" => "مهلت ۳۰ دقیقه‌ای لغو سفارش به پایان رسیده است.",
            "invalid input" => "اطلاعات ورودی سفارش معتبر نیستند.",
            "can't create order" => "امکان ایجاد سفارش در درگاه پرداخت وجود ندارد.",
            _ => rawMessage
        };
    }

    private static string MapCodeToFriendlyMessage(int code) => code switch
    {
        1000 => "خطای احراز هویت درگاه ترب‌پی.",
        1003 => "داده‌های ورودی سفارش معتبر نیستند.",
        1005 => "توکن ارائه شده معتبر نیست.",
        1007 => "سفارشی با این توکن یافت نشد.",
        1011 => "مبلغ تراکنش نامعتبر است یا فرمت اطلاعات ارسالی صحیح نیست.",
        1017 => "فروشگاهی با این مشخصات در ترب‌پی یافت نشد.",
        1023 => "نام کاربری یا رمز عبور ترب‌پی ارسال نشده است.",
        1024 => "نام کاربری یا رمز عبور درگاه ترب‌پی اشتباه است.",
        1048 => "توکن به سفارش مربوط به این پذیرنده تعلق ندارد.",
        1053 => "وضعیت سفارش نامعتبر است.",
        1065 => "مهلت ۳۰ دقیقه‌ای لغو سفارش به پایان رسیده است.",
        1099 => "پذیرنده درگاه ترب‌پی غیرفعال یا مسدود است.",
        _ => $"خطای درگاه پرداخت ترب‌پی (کد {code})"
    };
}
