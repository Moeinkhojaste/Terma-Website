namespace Terma.Application.Payments;

public sealed class ZarinPalOptions
{
    public const string SectionName = "ZarinPal";

    public string MerchantId { get; set; } = "00000000-0000-0000-0000-000000000000";
    public bool IsSandbox { get; set; } = true;
    public string CallbackUrl { get; set; } = string.Empty;
    public string Currency { get; set; } = "IRT";

    public string GetRequestUrl() =>
        IsSandbox
            ? "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
            : "https://payment.zarinpal.com/pg/v4/payment/request.json";

    public string GetVerifyUrl() =>
        IsSandbox
            ? "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
            : "https://payment.zarinpal.com/pg/v4/payment/verify.json";

    public string GetStartPayUrl(string authority) =>
        IsSandbox
            ? $"https://sandbox.zarinpal.com/pg/StartPay/{authority}"
            : $"https://payment.zarinpal.com/pg/StartPay/{authority}";
}
