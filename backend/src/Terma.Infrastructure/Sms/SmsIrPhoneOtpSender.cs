using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Customers;
using Terma.Domain.Exceptions;
using Terma.Domain.Services;

namespace Terma.Infrastructure.Sms;

public sealed class SmsIrPhoneOtpSender : IPhoneOtpSender
{
    private readonly HttpClient _httpClient;
    private readonly SmsIrOptions _options;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<SmsIrPhoneOtpSender> _logger;

    public SmsIrPhoneOtpSender(
        HttpClient httpClient,
        IOptions<SmsIrOptions> options,
        IWebHostEnvironment environment,
        ILogger<SmsIrPhoneOtpSender> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _environment = environment;
        _logger = logger;
    }

    public async Task SendAsync(string normalizedPhone, string code, CancellationToken cancellationToken)
    {
        var localPhone = IranianPhoneNumber.ToLocalDisplay(normalizedPhone);
        var maskedPhone = MaskPhone(localPhone);

        if (!_options.IsConfigured)
        {
            if (_environment.IsDevelopment() || !_options.Enabled)
            {
                _logger.LogInformation(
                    ">>> [SMS.IR NOT CONFIGURED / DEV FALLBACK] Verification code for {Phone}: {Code} <<<",
                    maskedPhone,
                    code);
                return;
            }

            _logger.LogError("SMS.ir is enabled but not configured. ApiKey and TemplateId are required.");
            throw new DomainException("سامانه ارسال پیامک تنظیم نشده است. لطفاً با پشتیبانی تماس بگیرید.");
        }

        var payload = new SmsIrVerifyRequest
        {
            Mobile = localPhone,
            TemplateId = _options.TemplateId,
            Parameters =
            [
                new SmsIrParameter
                {
                    Name = string.IsNullOrWhiteSpace(_options.ParameterName) ? "Code" : _options.ParameterName.Trim(),
                    Value = code
                }
            ]
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "send/verify")
        {
            Content = JsonContent.Create(payload)
        };

        request.Headers.Add("x-api-key", _options.ApiKey);
        request.Headers.Accept.ParseAdd("application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to SMS.ir API while sending OTP to {Phone}", maskedPhone);
            throw new DomainException("برقراری ارتباط با سامانه ارسال پیامک ناموفق بود. لطفاً لحظاتی بعد مجدداً تلاش کنید.");
        }

        string responseContent;
        try
        {
            responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
        }
        catch
        {
            responseContent = string.Empty;
        }

        SmsIrVerifyResponse? result = null;
        if (!string.IsNullOrWhiteSpace(responseContent))
        {
            try
            {
                result = System.Text.Json.JsonSerializer.Deserialize<SmsIrVerifyResponse>(responseContent);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not parse SMS.ir response JSON: {Content}", responseContent);
            }
        }

        if (!response.IsSuccessStatusCode || result is null || result.Status != 1)
        {
            var errorMessage = result?.Message ?? $"HTTP {(int)response.StatusCode}";
            _logger.LogError(
                "SMS.ir OTP delivery rejected for {Phone}. Status: {Status}, Message: {Message}, Response: {Body}",
                maskedPhone,
                result?.Status,
                errorMessage,
                responseContent);

            throw new DomainException("ارسال پیامک تأیید با خطا مواجه شد. لطفاً لحظاتی بعد مجدداً تلاش کنید.");
        }

        _logger.LogInformation(
            "SMS.ir OTP code sent successfully to {Phone}. MessageId: {MessageId}",
            maskedPhone,
            result.Data?.MessageId);
    }

    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone) || phone.Length < 7) return "***";
        return $"{phone[..4]}***{phone[^3..]}";
    }

    private sealed class SmsIrVerifyRequest
    {
        [JsonPropertyName("mobile")]
        public string Mobile { get; set; } = string.Empty;

        [JsonPropertyName("templateId")]
        public int TemplateId { get; set; }

        [JsonPropertyName("parameters")]
        public SmsIrParameter[] Parameters { get; set; } = [];
    }

    private sealed class SmsIrParameter
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("value")]
        public string Value { get; set; } = string.Empty;
    }

    private sealed class SmsIrVerifyResponse
    {
        [JsonPropertyName("status")]
        public int Status { get; set; }

        [JsonPropertyName("message")]
        public string? Message { get; set; }

        [JsonPropertyName("data")]
        public SmsIrVerifyData? Data { get; set; }
    }

    private sealed class SmsIrVerifyData
    {
        [JsonPropertyName("messageId")]
        public long MessageId { get; set; }

        [JsonPropertyName("cost")]
        public decimal Cost { get; set; }
    }
}
