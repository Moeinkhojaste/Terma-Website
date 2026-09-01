using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Terma.Domain.Exceptions;
using Terma.Infrastructure.Sms;

namespace Terma.UnitTests.Infrastructure;

public class SmsIrPhoneOtpSenderTests
{
    [Fact]
    public void SmsIrOptions_IsConfigured_ReturnsExpectedValue()
    {
        var opt1 = new SmsIrOptions { ApiKey = "test_key", TemplateId = 12345, Enabled = true };
        var opt2 = new SmsIrOptions { ApiKey = "", TemplateId = 12345, Enabled = true };
        var opt3 = new SmsIrOptions { ApiKey = "test_key", TemplateId = 0, Enabled = true };
        var opt4 = new SmsIrOptions { ApiKey = "test_key", TemplateId = 12345, Enabled = false };

        Assert.True(opt1.IsConfigured);
        Assert.False(opt2.IsConfigured);
        Assert.False(opt3.IsConfigured);
        Assert.False(opt4.IsConfigured);
    }

    [Fact]
    public async Task SendAsync_WhenUnconfiguredInDevelopment_LogsAndReturnsWithoutThrowing()
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Development);

        var options = Options.Create(new SmsIrOptions { Enabled = true, ApiKey = "", TemplateId = 0 });
        var handler = new TestHttpMessageHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.InternalServerError)));
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.sms.ir/v1/") };
        var sender = new SmsIrPhoneOtpSender(httpClient, options, envMock.Object, NullLogger<SmsIrPhoneOtpSender>.Instance);

        await sender.SendAsync("989123456789", "123456", CancellationToken.None);

        Assert.Equal(0, handler.CallCount);
    }

    [Fact]
    public async Task SendAsync_WhenUnconfiguredInProduction_ThrowsDomainException()
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var options = Options.Create(new SmsIrOptions { Enabled = true, ApiKey = "", TemplateId = 0 });
        var handler = new TestHttpMessageHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)));
        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.sms.ir/v1/") };
        var sender = new SmsIrPhoneOtpSender(httpClient, options, envMock.Object, NullLogger<SmsIrPhoneOtpSender>.Instance);

        var ex = await Assert.ThrowsAsync<DomainException>(() => sender.SendAsync("989123456789", "123456", CancellationToken.None));
        Assert.Contains("سامانه ارسال پیامک تنظیم نشده است", ex.Message);
    }

    [Fact]
    public async Task SendAsync_WhenConfigured_SendsCorrectPayloadAndHeadersToSmsIr()
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var options = Options.Create(new SmsIrOptions
        {
            Enabled = true,
            ApiKey = "secret_smsir_key",
            TemplateId = 98765,
            ParameterName = "Code"
        });

        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;

        var handler = new TestHttpMessageHandler(async (request, cancellationToken) =>
        {
            capturedRequest = request;
            if (request.Content is not null)
            {
                capturedBody = await request.Content.ReadAsStringAsync(cancellationToken);
            }

            var responseJson = JsonSerializer.Serialize(new
            {
                status = 1,
                message = "موفق",
                data = new { messageId = 1234567, cost = 1.5 }
            });

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json")
            };
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.sms.ir/v1/") };
        var sender = new SmsIrPhoneOtpSender(httpClient, options, envMock.Object, NullLogger<SmsIrPhoneOtpSender>.Instance);

        await sender.SendAsync("989123456789", "849201", CancellationToken.None);

        Assert.Equal(1, handler.CallCount);
        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Post, capturedRequest!.Method);
        Assert.Equal("https://api.sms.ir/v1/send/verify", capturedRequest.RequestUri?.ToString());
        Assert.True(capturedRequest.Headers.Contains("x-api-key"));
        Assert.Equal("secret_smsir_key", capturedRequest.Headers.GetValues("x-api-key").First());

        Assert.NotNull(capturedBody);
        using var jsonDoc = JsonDocument.Parse(capturedBody!);
        var root = jsonDoc.RootElement;
        Assert.Equal("09123456789", root.GetProperty("mobile").GetString());
        Assert.Equal(98765, root.GetProperty("templateId").GetInt32());

        var parameters = root.GetProperty("parameters");
        Assert.Equal(1, parameters.GetArrayLength());
        Assert.Equal("Code", parameters[0].GetProperty("name").GetString());
        Assert.Equal("849201", parameters[0].GetProperty("value").GetString());
    }

    [Fact]
    public async Task SendAsync_WhenSmsIrReturnsFailureStatus_ThrowsDomainException()
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var options = Options.Create(new SmsIrOptions
        {
            Enabled = true,
            ApiKey = "secret_smsir_key",
            TemplateId = 98765,
            ParameterName = "Code"
        });

        var handler = new TestHttpMessageHandler((_, _) =>
        {
            var responseJson = JsonSerializer.Serialize(new
            {
                status = 0,
                message = "اعتبار کافی نمی‌باشد",
                data = (object?)null
            });

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, System.Text.Encoding.UTF8, "application/json")
            });
        });

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.sms.ir/v1/") };
        var sender = new SmsIrPhoneOtpSender(httpClient, options, envMock.Object, NullLogger<SmsIrPhoneOtpSender>.Instance);

        var ex = await Assert.ThrowsAsync<DomainException>(() => sender.SendAsync("989123456789", "849201", CancellationToken.None));
        Assert.Contains("ارسال پیامک تأیید با خطا مواجه شد", ex.Message);
    }

    [Fact]
    public async Task SendAsync_WhenHttpFails_ThrowsDomainException()
    {
        var envMock = new Mock<IWebHostEnvironment>();
        envMock.Setup(e => e.EnvironmentName).Returns(Environments.Production);

        var options = Options.Create(new SmsIrOptions
        {
            Enabled = true,
            ApiKey = "secret_smsir_key",
            TemplateId = 98765,
            ParameterName = "Code"
        });

        var handler = new TestHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadGateway)));

        var httpClient = new HttpClient(handler) { BaseAddress = new Uri("https://api.sms.ir/v1/") };
        var sender = new SmsIrPhoneOtpSender(httpClient, options, envMock.Object, NullLogger<SmsIrPhoneOtpSender>.Instance);

        var ex = await Assert.ThrowsAsync<DomainException>(() => sender.SendAsync("989123456789", "849201", CancellationToken.None));
        Assert.Contains("ارسال پیامک تأیید با خطا مواجه شد", ex.Message);
    }

    private sealed class TestHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        : HttpMessageHandler
    {
        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return handler(request, cancellationToken);
        }
    }
}
