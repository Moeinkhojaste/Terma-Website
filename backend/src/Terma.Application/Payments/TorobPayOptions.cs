namespace Terma.Application.Payments;

public sealed class TorobPayOptions
{
    public const string SectionName = "TorobPay";

    public string BaseUrl { get; set; } = "https://cpg.torobpay.com/";
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? CallbackUrl { get; set; }
    public bool Enabled { get; set; } = true;

    public string GetTokenUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/v1/oauth/token";
    public string GetEligibleUrl(long amountInRials) => $"{BaseUrl.TrimEnd('/')}/api/online/offer/v1/eligible?amount={amountInRials}";
    public string GetPaymentTokenUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/token";
    public string GetVerifyUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/verify";
    public string GetSettleUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/settle";
    public string GetRevertUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/revert";
    public string GetCancelUrl() => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/cancel";
    public string GetStatusUrl(string paymentToken) => $"{BaseUrl.TrimEnd('/')}/api/online/payment/v1/status?paymentToken={Uri.EscapeDataString(paymentToken)}";
}
