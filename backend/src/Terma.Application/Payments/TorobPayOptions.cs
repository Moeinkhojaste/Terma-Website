namespace Terma.Application.Payments;

public static class TorobPayDefaults
{
    public const string BaseUrl = "https://cpg.torobpay.com/";
    public const string ClientId = "28941414";
    public const string ClientSecret = "20qQevRPn8RdofXm50nvRRwhZ3QEIQRpxq4B7boUm0PeLhDbLI3ebVXKHmQXlsihJ6zCGb";
    public const string Username = "termabrand.ir";
    public const string Password = "GaK2hMFUunFUVFkmLPLx";
}

public sealed class TorobPayOptions
{
    public const string SectionName = "TorobPay";

    public string BaseUrl { get; set; } = TorobPayDefaults.BaseUrl;
    public string ClientId { get; set; } = TorobPayDefaults.ClientId;
    public string ClientSecret { get; set; } = TorobPayDefaults.ClientSecret;
    public string Username { get; set; } = TorobPayDefaults.Username;
    public string Password { get; set; } = TorobPayDefaults.Password;
    public string? CallbackUrl { get; set; }
    public bool Enabled { get; set; } = true;

    private static string Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var trimmed = value.Trim().Trim('"', '\'', '`', ' ', '\t', '\r', '\n');
        if (trimmed.StartsWith("your_", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("ReplaceWith", StringComparison.OrdinalIgnoreCase))
        {
            return string.Empty;
        }
        return trimmed;
    }

    public string ResolvedBaseUrl
    {
        get
        {
            var b = Clean(BaseUrl);
            if (!string.IsNullOrWhiteSpace(b)) return b.TrimEnd('/');
            foreach (var env in new[] { "PROD_TOROBPAY_BASE_URL", "STAGING_TOROBPAY_BASE_URL", "TOROBPAY_BASE_URL", "TOROB_BASE_URL" })
            {
                var val = Clean(Environment.GetEnvironmentVariable(env));
                if (!string.IsNullOrWhiteSpace(val)) return val.TrimEnd('/');
            }
            return TorobPayDefaults.BaseUrl.TrimEnd('/');
        }
    }

    public string ResolvedClientId
    {
        get
        {
            var c = Clean(ClientId);
            if (!string.IsNullOrWhiteSpace(c)) return c;
            foreach (var env in new[] { "PROD_TOROBPAY_CLIENT_ID", "STAGING_TOROBPAY_CLIENT_ID", "TOROBPAY_CLIENT_ID", "TOROB_CLIENT_ID" })
            {
                var val = Clean(Environment.GetEnvironmentVariable(env));
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            if (ClientId != null && ClientId.Trim() == "") return string.Empty;
            return TorobPayDefaults.ClientId;
        }
    }

    public string ResolvedClientSecret
    {
        get
        {
            var s = Clean(ClientSecret);
            if (!string.IsNullOrWhiteSpace(s)) return s;
            foreach (var env in new[] { "PROD_TOROBPAY_CLIENT_SECRET", "STAGING_TOROBPAY_CLIENT_SECRET", "TOROBPAY_CLIENT_SECRET", "TOROB_CLIENT_SECRET" })
            {
                var val = Clean(Environment.GetEnvironmentVariable(env));
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            if (ClientSecret != null && ClientSecret.Trim() == "") return string.Empty;
            return TorobPayDefaults.ClientSecret;
        }
    }

    public string ResolvedUsername
    {
        get
        {
            var u = Clean(Username);
            if (!string.IsNullOrWhiteSpace(u)) return u;
            foreach (var env in new[] { "PROD_TOROBPAY_USERNAME", "STAGING_TOROBPAY_USERNAME", "TOROBPAY_USERNAME", "TOROB_USERNAME" })
            {
                var val = Clean(Environment.GetEnvironmentVariable(env));
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            if (Username != null && Username.Trim() == "") return string.Empty;
            return TorobPayDefaults.Username;
        }
    }

    public string ResolvedPassword
    {
        get
        {
            var p = Clean(Password);
            if (!string.IsNullOrWhiteSpace(p)) return p;
            foreach (var env in new[] { "PROD_TOROBPAY_PASSWORD", "STAGING_TOROBPAY_PASSWORD", "TOROBPAY_PASSWORD", "TOROB_PASSWORD" })
            {
                var val = Clean(Environment.GetEnvironmentVariable(env));
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
            if (Password != null && Password.Trim() == "") return string.Empty;
            return TorobPayDefaults.Password;
        }
    }

    public string GetTokenUrl() => $"{ResolvedBaseUrl}/api/online/v1/oauth/token";
    public string GetEligibleUrl(long amountInRials) => $"{ResolvedBaseUrl}/api/online/offer/v1/eligible?amount={amountInRials}";
    public string GetPaymentTokenUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/token";
    public string GetVerifyUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/verify";
    public string GetSettleUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/settle";
    public string GetRevertUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/revert";
    public string GetCancelUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/cancel";
    public string GetStatusUrl(string paymentToken) => $"{ResolvedBaseUrl}/api/online/payment/v1/status?paymentToken={Uri.EscapeDataString(paymentToken)}";
}
