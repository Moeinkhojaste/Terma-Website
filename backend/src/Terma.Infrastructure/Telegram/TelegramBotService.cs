using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Common.Interfaces;
using Terma.Application.Telegram;

namespace Terma.Infrastructure.Telegram;

public sealed class TelegramBotService : ITelegramBotService
{
    private static readonly PersianCalendar Pc = new();
    private static readonly TimeZoneInfo IranTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Iran Standard Time" : "Asia/Tehran");

    private readonly HttpClient _httpClient;
    private readonly TelegramOptions _options;
    private readonly ILogger<TelegramBotService> _logger;

    public TelegramBotService(
        HttpClient httpClient,
        IOptions<TelegramOptions> options,
        ILogger<TelegramBotService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task NotifyNewOrderAsync(OrderNotificationDto order, CancellationToken ct = default)
    {
        if (!_options.IsConfigured)
        {
            _logger.LogDebug("Telegram bot is not configured or disabled. Skipping order notification for order {OrderNumber}", order.OrderNumber);
            return;
        }

        var adminChatIds = _options.GetAdminChatIds();
        if (adminChatIds.Count == 0)
        {
            _logger.LogWarning("Telegram bot is enabled but no AdminChatId is configured.");
            return;
        }

        var messageText = BuildNewOrderMessageHtml(order);
        var inlineKeyboard = BuildOrderActionKeyboard(order.OrderId);

        foreach (var chatId in adminChatIds)
        {
            try
            {
                await SendMessageAsync(chatId, messageText, inlineKeyboard, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send Telegram new order notification to chat {ChatId} for order {OrderNumber}", chatId, order.OrderNumber);
            }
        }
    }

    public async Task SendMessageAsync(long chatId, string htmlText, object? replyMarkup = null, CancellationToken ct = default)
    {
        if (!_options.IsConfigured) return;

        var url = $"https://api.telegram.org/bot{_options.BotToken}/sendMessage";
        var payload = new Dictionary<string, object?>
        {
            ["chat_id"] = chatId,
            ["text"] = htmlText,
            ["parse_mode"] = "HTML",
            ["disable_web_page_preview"] = true
        };

        if (replyMarkup is not null)
        {
            payload["reply_markup"] = replyMarkup;
        }

        var response = await _httpClient.PostAsJsonAsync(url, payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Telegram API sendMessage returned {StatusCode}: {Error}", response.StatusCode, errorBody);
        }
    }

    public async Task EditMessageTextAsync(long chatId, int messageId, string htmlText, object? replyMarkup = null, CancellationToken ct = default)
    {
        if (!_options.IsConfigured) return;

        var url = $"https://api.telegram.org/bot{_options.BotToken}/editMessageText";
        var payload = new Dictionary<string, object?>
        {
            ["chat_id"] = chatId,
            ["message_id"] = messageId,
            ["text"] = htmlText,
            ["parse_mode"] = "HTML",
            ["disable_web_page_preview"] = true
        };

        if (replyMarkup is not null)
        {
            payload["reply_markup"] = replyMarkup;
        }

        var response = await _httpClient.PostAsJsonAsync(url, payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Telegram API editMessageText returned {StatusCode}: {Error}", response.StatusCode, errorBody);
        }
    }

    public async Task AnswerCallbackQueryAsync(string callbackQueryId, string? alertText = null, bool showAlert = false, CancellationToken ct = default)
    {
        if (!_options.IsConfigured) return;

        var url = $"https://api.telegram.org/bot{_options.BotToken}/answerCallbackQuery";
        var payload = new Dictionary<string, object?>
        {
            ["callback_query_id"] = callbackQueryId,
            ["show_alert"] = showAlert
        };

        if (!string.IsNullOrWhiteSpace(alertText))
        {
            payload["text"] = alertText;
        }

        var response = await _httpClient.PostAsJsonAsync(url, payload, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("Telegram API answerCallbackQuery returned {StatusCode}: {Error}", response.StatusCode, errorBody);
        }
    }

    public static string BuildNewOrderMessageHtml(OrderNotificationDto order)
    {
        var iranTime = TimeZoneInfo.ConvertTimeFromUtc(order.CreatedAtUtc, IranTimeZone);
        var persianDate = $"{Pc.GetYear(iranTime):0000}/{Pc.GetMonth(iranTime):00}/{Pc.GetDayOfMonth(iranTime):00} - {iranTime:HH:mm}";

        var itemsSummary = string.Join("\n\n", order.Items.Select((item, idx) =>
        {
            var details = new List<string>();

            if (!string.IsNullOrWhiteSpace(item.VariantTitle) && item.VariantTitle != "تنوع پیش‌فرض")
                details.Add($"     ▫️ سایز / عنوان: <b>{Escape(item.VariantTitle)}</b>");

            if (item.TableCapacity.HasValue && item.TableCapacity.Value > 0)
                details.Add($"     ▫️ ظرفیت: <b>{item.TableCapacity.Value} نفره</b>");

            if (item.Length.HasValue && item.Width.HasValue && item.Length.Value > 0 && item.Width.Value > 0)
                details.Add($"     ▫️ ابعاد: <b>{item.Length.Value:G29} × {item.Width.Value:G29} سانتی‌متر</b>");

            if (!string.IsNullOrWhiteSpace(item.Color) && item.Color != "بدون رنگ")
                details.Add($"     ▫️ رنگ: <b>{Escape(item.Color)}</b>");

            if (!string.IsNullOrWhiteSpace(item.FabricType) || !string.IsNullOrWhiteSpace(item.LiningType))
            {
                var fabricParts = new List<string>();
                if (!string.IsNullOrWhiteSpace(item.FabricType)) fabricParts.Add($"جنس: <b>{Escape(item.FabricType)}</b>");
                if (!string.IsNullOrWhiteSpace(item.LiningType)) fabricParts.Add($"آستر: <b>{Escape(item.LiningType)}</b>");
                details.Add($"     ▫️ {string.Join(" | ", fabricParts)}");
            }

            if (!string.IsNullOrWhiteSpace(item.Pattern))
                details.Add($"     ▫️ طرح: <b>{Escape(item.Pattern)}</b>");

            var extraDetails = details.Count > 0 ? "\n" + string.Join("\n", details) : string.Empty;

            return $"  🔹 <b>{idx + 1}. {Escape(item.ProductName)}</b>\n" +
                   $"     ▫️ کد کالا (SKU): <code>{Escape(item.Sku)}</code>" +
                   extraDetails + "\n" +
                   $"     ▫️ تعداد: <b>{item.Quantity}</b> × <b>{item.UnitPrice:N0} تومان</b> = <b>{(item.UnitPrice * item.Quantity):N0} تومان</b>";
        }));

        var discountPart = order.DiscountTotal > 0
            ? $"\n🔻 <b>تخفیف:</b> {order.DiscountTotal:N0} تومان"
            : string.Empty;

        var notesPart = !string.IsNullOrWhiteSpace(order.CustomerNotes)
            ? $"\n📝 <b>یادداشت مشتری:</b> <i>{Escape(order.CustomerNotes)}</i>"
            : string.Empty;

        var emailPart = !string.IsNullOrWhiteSpace(order.CustomerEmail)
            ? $"\n✉️ <b>ایمیل:</b> {Escape(order.CustomerEmail)}"
            : string.Empty;

        return $"""
            🛍 <b>سفارش جدید ثبت شد!</b>
            ━━━━━━━━━━━━━━━━━
            🔖 <b>شماره سفارش:</b> <code>{Escape(order.OrderNumber)}</code>
            📅 <b>زمان ثبت:</b> {persianDate}
            
            👤 <b>مشتری:</b> {Escape(order.CustomerName)}
            📞 <b>شماره تماس:</b> <a href="tel:{order.CustomerPhone}">{order.CustomerPhone}</a>{emailPart}
            
            📍 <b>آدرس تحویل:</b>
            {Escape(order.Province)} - {Escape(order.City)}
            {Escape(order.Address)}
            📮 <b>کد پستی:</b> <code>{Escape(order.PostalCode)}</code>{notesPart}
            
            📦 <b>اقلام سفارش ({order.Items.Count} قلم):</b>
            {itemsSummary}
            
            ━━━━━━━━━━━━━━━━━
            💵 <b>جمع اقلام:</b> {order.Subtotal:N0} تومان{discountPart}
            🚚 <b>هزینه ارسال:</b> {(order.ShippingTotal == 0 ? "رایگان" : $"{order.ShippingTotal:N0} تومان")}
            💳 <b>مبلغ کل پرداختی:</b> <b>{order.TotalAmount:N0} تومان</b>
            
            ⚙️ <b>وضعیت کنونی:</b> ⏳ در انتظار تایید
            """;
    }

    public static object BuildOrderActionKeyboard(Guid orderId)
    {
        return new
        {
            inline_keyboard = new[]
            {
                new[]
                {
                    new { text = "✅ تایید سفارش", callback_data = $"order:confirm:{orderId}" },
                    new { text = "🚚 ارسال شد", callback_data = $"order:ship:{orderId}" }
                },
                new[]
                {
                    new { text = "❌ لغو سفارش", callback_data = $"order:cancel:{orderId}" },
                    new { text = "🔄 استعلام وضعیت", callback_data = $"order:refresh:{orderId}" }
                }
            }
        };
    }

    public static string Escape(string text) => WebUtility.HtmlEncode(text ?? string.Empty);
}
