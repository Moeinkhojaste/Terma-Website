using System.Net;
using System.Text;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Terma.Application.Payments;
using Terma.Domain.Entities;
using Terma.Infrastructure.Payments;

namespace Terma.UnitTests.Infrastructure;

public sealed class TorobPayGatewayServiceTests
{
    private static TorobPayOptions CreateDefaultOptions() => new()
    {
        BaseUrl = "https://cpg.torobpay.com/",
        ClientId = "test_client_id",
        ClientSecret = "test_client_secret",
        Username = "test_user",
        Password = "test_password",
        Enabled = true
    };

    [Fact]
    public async Task CheckEligibilityAsync_AmountBelowMinimum_ReturnsFalseImmediately()
    {
        var options = Options.Create(CreateDefaultOptions());
        using var client = new HttpClient();
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        // 19,000 Tomans = 190,000 Rials (< 200,000 Rials minimum)
        var result = await service.CheckEligibilityAsync(19_000);

        Assert.False(result.Eligible);
        Assert.Contains("حداقل مبلغ", result.TitleMessage);
    }

    [Fact]
    public async Task CheckEligibilityAsync_EligibleResponse_ReturnsTrueWithMessages()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"access_token": "mock-jwt-token"}""", Encoding.UTF8, "application/json")
                });
            }

            if (req.RequestUri.ToString().Contains("/offer/v1/eligible"))
            {
                Assert.Equal("Bearer", req.Headers.Authorization?.Scheme);
                Assert.Equal("mock-jwt-token", req.Headers.Authorization?.Parameter);
                Assert.Contains("amount=500000", req.RequestUri.Query); // 50,000 Tomans * 10 = 500,000 Rials

                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                    {
                        "successful": true,
                        "response": {
                            "eligible": true,
                            "title_message": "پرداخت اقساطی با ترب‌پی",
                            "description": "دریافت اعتبار و خرید در ۴ قسط"
                        }
                    }
                    """, Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.CheckEligibilityAsync(50_000);

        Assert.True(result.Eligible);
        Assert.Equal("پرداخت اقساطی با ترب‌پی", result.TitleMessage);
        Assert.Equal("دریافت اعتبار و خرید در ۴ قسط", result.Description);
    }

    [Fact]
    public async Task RequestPaymentAsync_ValidOrder_SendsRialsAmountAndReturnsTokenAndUrl()
    {
        var options = Options.Create(CreateDefaultOptions());
        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1001", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 10_000, shippingTotal: 25_000, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        var product = new Product("ترمه سنتی", "TRM-SKU-1", "توضیحات", 100_000, 10, 6, 100, 100, "ابریشم", "ساتن", "قرمز", "بته جقه", Guid.NewGuid());
        order.AddItem(new OrderItem(product.Id, null, product.Name, product.Sku, 100_000, 1));

        var handler = new TestHttpMessageHandler(async (req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"access_token": "mock-jwt-token"}""", Encoding.UTF8, "application/json")
                };
            }

            if (req.RequestUri.ToString().Contains("/payment/v1/token"))
            {
                var body = await req.Content!.ReadAsStringAsync();
                Assert.Contains("\"amount\":1150000", body); // (100000 - 10000 + 25000) * 10 = 1,150,000 Rials
                Assert.Contains("\"paymentMethodTypeDto\":\"ONLINE_CREDIT\"", body);
                Assert.Contains("\"registration_phone_number\":\"09121112233\"", body);

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                    {
                        "successful": true,
                        "response": {
                            "paymentToken": "tp_token_12345",
                            "paymentPageUrl": "https://cpg.torobpay.com/payment/brief-details?payment_token=tp_token_12345"
                        }
                    }
                    """, Encoding.UTF8, "application/json")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.True(result.Success);
        Assert.Equal("tp_token_12345", result.Authority);
        Assert.Equal("https://cpg.torobpay.com/payment/brief-details?payment_token=tp_token_12345", result.PaymentUrl);
    }

    [Fact]
    public async Task VerifyPaymentAsync_Success_ReturnsVerifiedResult()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"access_token": "mock-jwt-token"}""", Encoding.UTF8, "application/json")
                });
            }

            if (req.RequestUri.ToString().Contains("/payment/v1/verify"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                    {
                        "successful": true,
                        "response": {
                            "transactionId": "txn-998877"
                        }
                    }
                    """, Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.VerifyPaymentAsync("tp_token_12345");

        Assert.True(result.Success);
        Assert.NotNull(result.RefId);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task SettlePaymentAsync_Success_ReturnsTrue()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"access_token": "mock-jwt-token"}""", Encoding.UTF8, "application/json")
                });
            }

            if (req.RequestUri.ToString().Contains("/payment/v1/settle"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                    {
                        "successful": true,
                        "response": {
                            "transactionId": "txn-998877"
                        }
                    }
                    """, Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.SettlePaymentAsync("tp_token_12345");

        Assert.True(result);
    }

    [Fact]
    public async Task RequestPaymentAsync_MissingClientId_ReturnsDescriptiveConfigError()
    {
        var options = Options.Create(new TorobPayOptions
        {
            BaseUrl = "https://cpg.torobpay.com/",
            ClientId = "", // Missing
            ClientSecret = "secret",
            Username = "user",
            Password = "pwd",
            Enabled = true
        });

        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1002", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 0, shippingTotal: 0, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        using var client = new HttpClient();
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.False(result.Success);
        Assert.Contains("شناسه یا کلید دسترسی", result.ErrorMessage);
    }

    [Fact]
    public async Task RequestPaymentAsync_OAuthHttpError_ReturnsDescriptiveStatusCodeError()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized)
                {
                    Content = new StringContent("""{"error": {"code": 1000, "message": "merchant is not authenticated"}}""", Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1003", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 0, shippingTotal: 0, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.False(result.Success);
        Assert.Contains("احراز هویت فروشگاه انجام نشد", result.ErrorMessage);
    }

    [Fact]
    public async Task CheckEligibilityAsync_OAuthFailure_ReturnsFalseWithDescriptiveError()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("IP not allowed", Encoding.UTF8, "text/plain")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.CheckEligibilityAsync(50_000);

        Assert.False(result.Eligible);
        Assert.Contains("403", result.TitleMessage);
    }

    [Fact]
    public async Task RequestPaymentAsync_OAuthReturnsErrorData1024_ReturnsDescriptiveInvalidCredentialsError()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("""{"successful":false,"errorData":{"errorCode":"1024","message":"invalid username or password","data":{}}}""", Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1004", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 0, shippingTotal: 0, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.False(result.Success);
        Assert.Contains("نام کاربری یا رمز عبور", result.ErrorMessage);
    }

    [Fact]
    public async Task RequestPaymentAsync_OAuthReturnsErrorData1099_ReturnsMerchantInactiveError()
    {
        var options = Options.Create(CreateDefaultOptions());
        var handler = new TestHttpMessageHandler((req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Forbidden)
                {
                    Content = new StringContent("""{"successful":false,"errorData":{"errorCode":"1099","message":"merchant inactive","data":{}}}""", Encoding.UTF8, "application/json")
                });
            }

            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        });

        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1005", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 0, shippingTotal: 0, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.False(result.Success);
        Assert.Contains("غیرفعال", result.ErrorMessage);
    }

    [Fact]
    public async Task RequestPaymentAsync_QuotedCredentialsInOptions_AreCleanedAndSendValidHeaders()
    {
        var options = Options.Create(new TorobPayOptions
        {
            BaseUrl = "\"https://cpg.torobpay.com/\"",
            ClientId = "\"custom_client\"",
            ClientSecret = "\"custom_secret\"",
            Username = "\"custom_user\"",
            Password = "\"custom_password\"",
            Enabled = true
        });

        var handler = new TestHttpMessageHandler(async (req, _) =>
        {
            if (req.RequestUri!.ToString().Contains("/oauth/token"))
            {
                // Verify basic auth header is clean without surrounding quotes
                var auth = req.Headers.Authorization?.Parameter;
                var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(auth!));
                Assert.Equal("custom_client:custom_secret", decoded);

                var body = await req.Content!.ReadAsStringAsync();
                Assert.Contains("\"username\":\"custom_user\"", body);
                Assert.Contains("\"password\":\"custom_password\"", body);

                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""{"access_token": "mock-clean-token"}""", Encoding.UTF8, "application/json")
                };
            }

            if (req.RequestUri.ToString().Contains("/payment/v1/token"))
            {
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent("""
                    {
                        "successful": true,
                        "response": {
                            "paymentToken": "tok_123",
                            "paymentPageUrl": "https://torobpay.com/payment/brief-details?payment_token=tok_123"
                        }
                    }
                    """, Encoding.UTF8, "application/json")
                };
            }

            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var customer = new Customer("علی احمدی", "09121112233", "ali@example.com");
        var order = new Order("TRM-1006", customer, "تهران", "تهران", "خیابان آزادی پلاک ۱", "1234567890",
            subtotal: 100_000, discountTotal: 0, shippingTotal: 0, reservationExpiresAtUtc: DateTime.UtcNow.AddMinutes(30));

        using var client = new HttpClient(handler);
        var service = new TorobPayGatewayService(client, options, NullLogger<TorobPayGatewayService>.Instance);

        var result = await service.RequestPaymentAsync(order, "https://termabrand.ir/api/payment/torob/callback");

        Assert.True(result.Success, result.ErrorMessage);
        Assert.Equal("tok_123", result.Authority);
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
