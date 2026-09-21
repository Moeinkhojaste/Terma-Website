using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Terma.Application.Payments;
using Terma.Domain.Entities;
using Terma.Infrastructure.Payments;

namespace Terma.UnitTests.Infrastructure;

public sealed class ZarinPalGatewayServiceTests
{
    [Fact]
    public void ZarinPalOptions_SandboxUrls_MatchExpectedEndpoints()
    {
        var options = new ZarinPalOptions
        {
            IsSandbox = true,
            MerchantId = "00000000-0000-0000-0000-000000000000"
        };

        Assert.Equal("https://sandbox.zarinpal.com/pg/v4/payment/request.json", options.GetRequestUrl());
        Assert.Equal("https://sandbox.zarinpal.com/pg/v4/payment/verify.json", options.GetVerifyUrl());
        Assert.Equal("https://sandbox.zarinpal.com/pg/StartPay/S12345", options.GetStartPayUrl("S12345"));
    }

    [Fact]
    public void ZarinPalOptions_ProductionUrls_MatchExpectedEndpoints()
    {
        var options = new ZarinPalOptions
        {
            IsSandbox = false,
            MerchantId = "real-merchant-guid"
        };

        Assert.Equal("https://payment.zarinpal.com/pg/v4/payment/request.json", options.GetRequestUrl());
        Assert.Equal("https://payment.zarinpal.com/pg/v4/payment/verify.json", options.GetVerifyUrl());
        Assert.Equal("https://payment.zarinpal.com/pg/StartPay/A12345", options.GetStartPayUrl("A12345"));
    }

    [Fact]
    public async Task RequestPaymentAsync_SuccessfulResponse_ReturnsPaymentUrlAndAuthority()
    {
        var jsonResponse = """
        {
            "data": {
                "code": 100,
                "message": "Success",
                "authority": "S00000000000000000000000000000000000",
                "fee_type": "Merchant",
                "fee": 0
            },
            "errors": []
        }
        """;

        var handler = new TestHttpMessageHandler((req, _) =>
        {
            Assert.Equal("https://sandbox.zarinpal.com/pg/v4/payment/request.json", req.RequestUri?.ToString());
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
            });
        });

        var client = new HttpClient(handler);
        var options = Options.Create(new ZarinPalOptions
        {
            IsSandbox = true,
            MerchantId = "00000000-0000-0000-0000-000000000000"
        });

        var service = new ZarinPalGatewayService(client, options, NullLogger<ZarinPalGatewayService>.Instance);

        var customer = new Customer("علی رضایی", "09123456789", "ali@example.com");
        var order = new Order("TRM-14030101-001", customer, "تهران", "تهران", "خیابان آزادی", "1234567890", 2500000m, 0, 0, DateTime.UtcNow.AddHours(24));

        var result = await service.RequestPaymentAsync(order, "https://staging.termabrand.ir/api/payment/zarinpal/callback");

        Assert.True(result.Success);
        Assert.Equal("S00000000000000000000000000000000000", result.Authority);
        Assert.Equal("https://sandbox.zarinpal.com/pg/StartPay/S00000000000000000000000000000000000", result.PaymentUrl);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task RequestPaymentAsync_ErrorResponse_ReturnsErrorMessage()
    {
        var jsonResponse = """
        {
            "data": [],
            "errors": {
                "code": -9,
                "message": "Validation error"
            }
        }
        """;

        var handler = new TestHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
            }));

        var client = new HttpClient(handler);
        var options = Options.Create(new ZarinPalOptions { IsSandbox = true });
        var service = new ZarinPalGatewayService(client, options, NullLogger<ZarinPalGatewayService>.Instance);

        var customer = new Customer("علی رضایی", "09123456789", null);
        var order = new Order("TRM-14030101-001", customer, "تهران", "تهران", "خیابان آزادی", "1234567890", 500000m, 0, 0, DateTime.UtcNow.AddHours(24));

        var result = await service.RequestPaymentAsync(order, "https://staging.termabrand.ir/api/payment/zarinpal/callback");

        Assert.False(result.Success);
        Assert.Null(result.PaymentUrl);
        Assert.Contains("شناسه مرچنت یا آدرس بازگشت صحیح نیست", result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyPaymentAsync_SuccessfulResponse_ReturnsRefId()
    {
        var jsonResponse = """
        {
            "data": {
                "code": 100,
                "message": "Verified",
                "card_hash": "hash-xyz",
                "card_pan": "502229******9876",
                "ref_id": 123456789012,
                "fee_type": "Merchant",
                "fee": 500
            },
            "errors": []
        }
        """;

        var handler = new TestHttpMessageHandler((req, _) =>
        {
            Assert.Equal("https://sandbox.zarinpal.com/pg/v4/payment/verify.json", req.RequestUri?.ToString());
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
            });
        });

        var client = new HttpClient(handler);
        var options = Options.Create(new ZarinPalOptions { IsSandbox = true });
        var service = new ZarinPalGatewayService(client, options, NullLogger<ZarinPalGatewayService>.Instance);

        var result = await service.VerifyPaymentAsync(1000000m, "S00000000000000000000000000000000000");

        Assert.True(result.Success);
        Assert.Equal(123456789012, result.RefId);
        Assert.Equal("502229******9876", result.CardPan);
        Assert.Equal("hash-xyz", result.CardHash);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task VerifyPaymentAsync_FailedResponse_ReturnsError()
    {
        var jsonResponse = """
        {
            "data": [],
            "errors": {
                "code": -51,
                "message": "Payment failed"
            }
        }
        """;

        var handler = new TestHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, Encoding.UTF8, "application/json")
            }));

        var client = new HttpClient(handler);
        var options = Options.Create(new ZarinPalOptions { IsSandbox = true });
        var service = new ZarinPalGatewayService(client, options, NullLogger<ZarinPalGatewayService>.Instance);

        var result = await service.VerifyPaymentAsync(1000000m, "S00000000000000000000000000000000000");

        Assert.False(result.Success);
        Assert.Null(result.RefId);
        Assert.Contains("پرداخت ناموفق بود یا توسط کاربر لغو شده است", result.ErrorMessage);
    }

    private sealed class TestHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> handler)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return handler(request, cancellationToken);
        }
    }
}
