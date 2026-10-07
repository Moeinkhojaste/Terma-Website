namespace Terma.Application.Payments;

/// <summary>
/// Texts that are shown directly to customers in the storefront. They must never contain payment
/// gateway internals - credentials, provider error codes, provider jargon or English stack text.
/// The technical cause stays in the gateway's ErrorMessage (logs, admin, support) while customers
/// only ever see one of these messages.
/// </summary>
public static class PaymentCustomerMessages
{
    public const string OnlineMethodHint = "می‌توانید همین سفارش را با «پرداخت آنلاین از درگاه پرداخت» نهایی کنید.";

    /// <summary>Fallback for any gateway failure that has no more specific customer text.</summary>
    public const string GatewayUnavailable =
        "اتصال به درگاه پرداخت برقرار نشد و مبلغی از حساب شما کسر نشده است. لطفاً چند لحظه بعد دوباره تلاش کنید. " + OnlineMethodHint;

    public const string TorobUnavailable =
        "پرداخت اقساطی ترب‌پی در حال حاضر در دسترس نیست. " + OnlineMethodHint;

    public const string TorobDisabled =
        "پرداخت اقساطی ترب‌پی در حال حاضر غیرفعال است. لطفاً سفارش خود را با «پرداخت آنلاین از درگاه پرداخت» نهایی کنید.";

    public const string TorobOrderRejected =
        "ثبت سفارش برای پرداخت اقساطی ترب‌پی انجام نشد و مبلغی از حساب شما کسر نشده است. " + OnlineMethodHint;

    public const string TorobConnectionFailed =
        "ارتباط با سرویس پرداخت اقساطی ترب‌پی برقرار نشد. لطفاً چند لحظه بعد دوباره تلاش کنید. " + OnlineMethodHint;

    public const string TorobVerificationFailed =
        "پرداخت اقساطی ترب‌پی تأیید نشد و سفارش شما نهایی نشد. اگر مبلغی از حساب شما کسر شده باشد، برای پیگیری با پشتیبانی فروشگاه تماس بگیرید. " + OnlineMethodHint;

    public const string ZarinPalUnavailable =
        "پرداخت آنلاین در این لحظه انجام نشد و مبلغی از حساب شما کسر نشده است. لطفاً چند دقیقه بعد دوباره تلاش کنید.";

    public const string ZarinPalVerificationFailed =
        "پرداخت آنلاین تأیید نشد و سفارش شما نهایی نشد. لطفاً سفارش خود را دوباره ثبت کنید یا با پشتیبانی فروشگاه تماس بگیرید.";
}
