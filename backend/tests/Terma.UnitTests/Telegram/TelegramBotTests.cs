using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Terma.Application.Common.Interfaces;
using Terma.Application.Store;
using Terma.Application.Telegram;
using Terma.Domain.Entities;
using Terma.Infrastructure.Telegram;

namespace Terma.UnitTests.Telegram;

public class TelegramBotTests
{
    [Fact]
    public void TelegramOptions_IsAdmin_IdentifiesAuthorizedUsersCorrectly()
    {
        var options = new TelegramOptions
        {
            BotToken = "123456:ABC-DEF",
            AdminChatId = "1001, 2002, 3003",
            Enabled = true
        };

        Assert.True(options.IsAdmin(1001));
        Assert.True(options.IsAdmin(2002));
        Assert.True(options.IsAdmin(3003));
        Assert.False(options.IsAdmin(9999));
        Assert.False(options.IsAdmin(0));
    }

    [Fact]
    public void TelegramOptions_IsConfigured_ReturnsTrueOnlyWhenTokenPresentAndEnabled()
    {
        var options1 = new TelegramOptions { BotToken = "valid_token", Enabled = true };
        var options2 = new TelegramOptions { BotToken = "valid_token", Enabled = false };
        var options3 = new TelegramOptions { BotToken = "", Enabled = true };

        Assert.True(options1.IsConfigured);
        Assert.False(options2.IsConfigured);
        Assert.False(options3.IsConfigured);
    }

    [Fact]
    public void BuildNewOrderMessageHtml_EscapesHtmlAndFormatsPersianDetails()
    {
        var orderId = Guid.NewGuid();
        var order = new OrderNotificationDto(
            OrderId: orderId,
            OrderNumber: "ORD-2026-999",
            CustomerName: "علی & رضایی <تست>",
            CustomerPhone: "09121234567",
            CustomerEmail: "ali@example.com",
            Province: "تهران",
            City: "تهران",
            Address: "خیابان ولیعصر، پلاک ۱",
            PostalCode: "1234567890",
            CustomerNotes: "لطفا زنگ <۲> زده شود & قبلش تماس بگیرید",
            Subtotal: 1000000,
            DiscountTotal: 50000,
            ShippingTotal: 30000,
            TotalAmount: 980000,
            Items: new List<OrderNotificationItemDto>
            {
                new(
                    ProductId: Guid.NewGuid(),
                    VariantId: Guid.NewGuid(),
                    ProductName: "رومیزی ترمه <ابریشم>",
                    Sku: "TRM-01",
                    VariantTitle: "۴ نفره مربع",
                    Color: "آبی فیروزه‌ای",
                    TableCapacity: 4,
                    Length: 100,
                    Width: 100,
                    FabricType: "ابریشم اصل",
                    LiningType: "ساتن براق",
                    Pattern: "شاه‌عباسی",
                    UnitPrice: 500000,
                    Quantity: 2
                )
            },
            CreatedAtUtc: new DateTime(2026, 8, 25, 10, 30, 0, DateTimeKind.Utc)
        );

        var html = TelegramBotService.BuildNewOrderMessageHtml(order);

        Assert.Contains("ORD-2026-999", html);
        Assert.Contains("علی &amp; رضایی &lt;تست&gt;", html);
        Assert.Contains("09121234567", html);
        Assert.Contains("ali@example.com", html);
        Assert.Contains("تهران", html);
        Assert.Contains("رومیزی ترمه &lt;ابریشم&gt;", html);
        Assert.Contains("۴ نفره مربع", html);
        Assert.Contains("۴ نفره", html);
        Assert.Contains("100 × 100 سانتی‌متر", html);
        Assert.Contains("آبی فیروزه‌ای", html);
        Assert.Contains("ابریشم اصل", html);
        Assert.Contains("ساتن براق", html);
        Assert.Contains("شاه‌عباسی", html);
        Assert.Contains("لطفا زنگ &lt;۲&gt; زده شود &amp; قبلش تماس بگیرید", html);
        Assert.Contains("980,000 تومان", html);
        Assert.Contains("50,000 تومان", html);
    }

    [Fact]
    public void BuildOrderActionKeyboard_GeneratesProperCallbackData()
    {
        var orderId = Guid.NewGuid();
        var keyboardObj = TelegramBotService.BuildOrderActionKeyboard(orderId);

        Assert.NotNull(keyboardObj);
        var json = System.Text.Json.JsonSerializer.Serialize(keyboardObj);

        Assert.Contains($"order:confirm:{orderId}", json);
        Assert.Contains($"order:ship:{orderId}", json);
        Assert.Contains($"order:cancel:{orderId}", json);
        Assert.Contains($"order:refresh:{orderId}", json);
    }

    [Fact]
    public async Task TelegramUpdateHandler_RejectsUnauthorizedSender()
    {
        var botServiceMock = new Mock<ITelegramBotService>();
        var storeServiceMock = new Mock<IStoreOperationsService>();
        var options = Options.Create(new TelegramOptions
        {
            BotToken = "test_token",
            AdminChatId = "111",
            Enabled = true
        });
        var logger = NullLogger<TelegramUpdateHandler>.Instance;

        var handler = new TelegramUpdateHandler(botServiceMock.Object, storeServiceMock.Object, options, logger);

        var unauthorizedUpdate = new TelegramUpdate
        {
            UpdateId = 1,
            Message = new TelegramMessage
            {
                MessageId = 10,
                Chat = new TelegramChat { Id = 999 },
                From = new TelegramUser { Id = 999, Username = "intruder" },
                Text = "/stats"
            }
        };

        await handler.HandleUpdateAsync(unauthorizedUpdate);

        botServiceMock.Verify(b => b.SendMessageAsync(
            999,
            It.Is<string>(s => s.Contains("دسترسی غیرمجاز")),
            null,
            It.IsAny<CancellationToken>()
        ), Times.Once);
    }

    [Fact]
    public async Task TelegramUpdateHandler_ProcessesConfirmOrderCallback()
    {
        var botServiceMock = new Mock<ITelegramBotService>();
        var storeServiceMock = new Mock<IStoreOperationsService>();
        var orderId = Guid.NewGuid();

        var adminOrder = new AdminOrderDto(
            orderId, "ORD-100", "علی", "09121234567",
            OrderStatus.Confirmed, 500000, DateTime.UtcNow, DateTime.UtcNow.AddDays(1),
            "تهران", "تهران", "خیابان ۱", "12345", null, null, new List<AdminOrderItemDto>()
        );

        storeServiceMock.Setup(s => s.ChangeOrderStatusAsync(orderId, OrderStatus.Confirmed, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(adminOrder);

        var options = Options.Create(new TelegramOptions
        {
            BotToken = "test_token",
            AdminChatId = "111",
            Enabled = true
        });
        var logger = NullLogger<TelegramUpdateHandler>.Instance;

        var handler = new TelegramUpdateHandler(botServiceMock.Object, storeServiceMock.Object, options, logger);

        var callbackUpdate = new TelegramUpdate
        {
            UpdateId = 2,
            CallbackQuery = new TelegramCallbackQuery
            {
                Id = "query_123",
                From = new TelegramUser { Id = 111, Username = "admin" },
                Data = $"order:confirm:{orderId}",
                Message = new TelegramMessage
                {
                    MessageId = 55,
                    Chat = new TelegramChat { Id = 111 },
                    Text = "سفارش جدید\n⚙️ وضعیت کنونی: در انتظار تایید"
                }
            }
        };

        await handler.HandleUpdateAsync(callbackUpdate);

        storeServiceMock.Verify(s => s.ChangeOrderStatusAsync(orderId, OrderStatus.Confirmed, null, It.IsAny<CancellationToken>()), Times.Once);
        botServiceMock.Verify(b => b.AnswerCallbackQueryAsync("query_123", It.Is<string>(s => s.Contains("تایید شد")), false, It.IsAny<CancellationToken>()), Times.Once);
        botServiceMock.Verify(b => b.EditMessageTextAsync(111, 55, It.Is<string>(s => s.Contains("تایید شده")), It.IsAny<object>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
