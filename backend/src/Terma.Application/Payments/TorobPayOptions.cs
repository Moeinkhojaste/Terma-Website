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

    /// <summary>
    /// Characters that must never survive inside a resolved credential. They are invisible in
    /// editors, terminals and chat messages, so credentials copied from the merchant panel or a
    /// PDF commonly carry them; TorobPay answers such a request with error 1023
    /// ("no username or password") because the value arrives blank or unusable.
    /// </summary>
    private static bool IsInvisible(char value) => value switch
    {
        '\u00a0' or '\u200b' or '\u200c' or '\u200d' or '\u200e' or '\u200f' or '\ufeff' => true,
        >= '\u202a' and <= '\u202e' => true,
        _ => false
    };

    internal static string Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;

        var builder = new System.Text.StringBuilder(value.Length);
        foreach (var ch in value)
        {
            if (!IsInvisible(ch))
            {
                builder.Append(ch);
            }
        }

        return builder.ToString().Trim().Trim('"', '\'', '`', ' ', '\t', '\r', '\n');
    }

    private string Resolve(string? configuredValue, string[] environmentVariables, string fallback)
    {
        var configured = Clean(configuredValue);
        if (!string.IsNullOrWhiteSpace(configured)) return configured;

        foreach (var name in environmentVariables)
        {
            var fromEnvironment = Clean(Environment.GetEnvironmentVariable(name));
            if (!string.IsNullOrWhiteSpace(fromEnvironment)) return fromEnvironment;
        }

        return fallback;
    }

    private string ResolveSource(string? configuredValue, string[] environmentVariables)
    {
        if (!string.IsNullOrWhiteSpace(Clean(configuredValue))) return "configuration";

        foreach (var name in environmentVariables)
        {
            if (!string.IsNullOrWhiteSpace(Clean(Environment.GetEnvironmentVariable(name)))) return "environment";
        }

        return "built-in-default";
    }

    private static readonly string[] BaseUrlVariables = ["PROD_TOROBPAY_BASE_URL", "STAGING_TOROBPAY_BASE_URL", "TOROBPAY_BASE_URL", "TOROB_BASE_URL"];
    private static readonly string[] ClientIdVariables = ["PROD_TOROBPAY_CLIENT_ID", "STAGING_TOROBPAY_CLIENT_ID", "TOROBPAY_CLIENT_ID", "TOROB_CLIENT_ID"];
    private static readonly string[] ClientSecretVariables = ["PROD_TOROBPAY_CLIENT_SECRET", "STAGING_TOROBPAY_CLIENT_SECRET", "TOROBPAY_CLIENT_SECRET", "TOROB_CLIENT_SECRET"];
    private static readonly string[] UsernameVariables = ["PROD_TOROBPAY_USERNAME", "STAGING_TOROBPAY_USERNAME", "TOROBPAY_USERNAME", "TOROB_USERNAME"];
    private static readonly string[] PasswordVariables = ["PROD_TOROBPAY_PASSWORD", "STAGING_TOROBPAY_PASSWORD", "TOROBPAY_PASSWORD", "TOROB_PASSWORD"];

    public string ResolvedBaseUrl
    {
        get
        {
            var resolved = Resolve(BaseUrl, BaseUrlVariables, TorobPayDefaults.BaseUrl).TrimEnd('/');

            // Credentials must never travel over plain HTTP: an http:// gateway URL answers with a
            // 302 redirect, and following it drops the POST body (Browsers/.NET turn it into a GET),
            // which TorobPay reports as "no username or password".
            if (resolved.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !IsLoopback(resolved))
            {
                resolved = $"https://{resolved["http://".Length..]}";
            }

            return resolved;
        }
    }

    private static bool IsLoopback(string url) =>
        Uri.TryCreate(url, UriKind.Absolute, out var uri) &&
        (uri.IsLoopback || string.Equals(uri.Host, "localhost", StringComparison.OrdinalIgnoreCase));

    // A blank configured value must never disable authentication. Resolution order is
    // configuration -> environment -> the verified built-in merchant credentials, so a stale or
    // partially populated appsettings file on the server can no longer produce a credential-less
    // OAuth request. Use TorobPay:Enabled to switch the gateway off.
    public string ResolvedClientId => Resolve(ClientId, ClientIdVariables, TorobPayDefaults.ClientId);
    public string ResolvedClientSecret => Resolve(ClientSecret, ClientSecretVariables, TorobPayDefaults.ClientSecret);
    public string ResolvedUsername => Resolve(Username, UsernameVariables, TorobPayDefaults.Username);
    public string ResolvedPassword => Resolve(Password, PasswordVariables, TorobPayDefaults.Password);

    /// <summary>
    /// Secret-free snapshot of the effective gateway configuration, safe to write to logs. It makes
    /// a credential problem visible without exposing the merchant secret or password.
    /// </summary>
    public string DescribeForDiagnostics() =>
        $"baseUrl={ResolvedBaseUrl}; clientId={ResolvedClientId} (source={ResolveSource(ClientId, ClientIdVariables)}); " +
        $"clientSecretLength={ResolvedClientSecret.Length}; username={ResolvedUsername} (source={ResolveSource(Username, UsernameVariables)}); " +
        $"passwordLength={ResolvedPassword.Length}; enabled={Enabled}";

    public string GetTokenUrl() => $"{ResolvedBaseUrl}/api/online/v1/oauth/token";
    public string GetEligibleUrl(long amountInRials) => $"{ResolvedBaseUrl}/api/online/offer/v1/eligible?amount={amountInRials}";
    public string GetPaymentTokenUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/token";
    public string GetVerifyUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/verify";
    public string GetSettleUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/settle";
    public string GetRevertUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/revert";
    public string GetCancelUrl() => $"{ResolvedBaseUrl}/api/online/payment/v1/cancel";
    public string GetStatusUrl(string paymentToken) => $"{ResolvedBaseUrl}/api/online/payment/v1/status?paymentToken={Uri.EscapeDataString(paymentToken)}";
}
