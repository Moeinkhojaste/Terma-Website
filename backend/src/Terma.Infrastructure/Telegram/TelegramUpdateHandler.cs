using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Common.Interfaces;
using Terma.Application.Store;
using Terma.Application.Telegram;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Telegram;

public sealed partial class TelegramUpdateHandler : ITelegramUpdateHandler
{
    private static readonly PersianCalendar Pc = new();
    private static readonly TimeZoneInfo IranTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Iran Standard Time" : "Asia/Tehran");

    private readonly ITelegramBotService _botService;
    private readonly IStoreOperationsService _storeService;
    private readonly TelegramOptions _options;
    private readonly ILogger<TelegramUpdateHandler> _logger;

    public TelegramUpdateHandler(
        ITelegramBotService botService,
        IStoreOperationsService storeService,
        IOptions<TelegramOptions> options,
        ILogger<TelegramUpdateHandler> logger)
    {
        _botService = botService;
        _storeService = storeService;
        _options = options.Value;
        _logger = logger;
    }

    public async Task HandleUpdateAsync(TelegramUpdate update, CancellationToken ct = default)
    {
        if (update.CallbackQuery is not null)
        {
            await HandleCallbackQueryAsync(update.CallbackQuery, ct);
            return;
        }

        if (update.Message is not null && !string.IsNullOrWhiteSpace(update.Message.Text))
        {
            await HandleMessageAsync(update.Message, ct);
        }
    }

    private async Task HandleCallbackQueryAsync(TelegramCallbackQuery query, CancellationToken ct)
    {
        var senderId = query.From.Id;
        if (!_options.IsAdmin(senderId))
        {
            _logger.LogWarning("Unauthorized callback query attempt from Telegram User ID {UserId} ({Username})", senderId, query.From.Username);
            await _botService.AnswerCallbackQueryAsync(query.Id, "⛔ شما اجازه انجام این عملیات را ندارید.", showAlert: true, ct);
            return;
        }

        var data = query.Data ?? string.Empty;
        var parts = data.Split(':');
        if (parts.Length < 3 || parts[0] != "order")
        {
            await _botService.AnswerCallbackQueryAsync(query.Id, "دستور نامعتبر است.", showAlert: false, ct);
            return;
        }

        var action = parts[1];
        if (!Guid.TryParse(parts[2], out var orderId))
        {
            await _botService.AnswerCallbackQueryAsync(query.Id, "شناسه سفارش نامعتبر است.", showAlert: true, ct);
            return;
        }

        try
        {
            switch (action.ToLowerInvariant())
            {
                case "confirm":
                {
                    var updated = await _storeService.ChangeOrderStatusAsync(orderId, OrderStatus.Confirmed, null, ct);
                    await _botService.AnswerCallbackQueryAsync(query.Id, $"✅ سفارش {updated.Number} تایید شد.", showAlert: false, ct);
                    await UpdateMessageAfterStatusChangeAsync(query, updated, "✅ تایید شده", ct);
                    break;
                }
                case "ship":
                {
                    var updated = await _storeService.ChangeOrderStatusAsync(orderId, OrderStatus.Shipped, null, ct);
                    await _botService.AnswerCallbackQueryAsync(query.Id, $"🚚 سفارش {updated.Number} به عنوان ارسال شده ثبت شد.", showAlert: false, ct);
                    await UpdateMessageAfterStatusChangeAsync(query, updated, "🚚 ارسال شده", ct);
                    break;
                }
                case "cancel":
                {
                    var updated = await _storeService.ChangeOrderStatusAsync(orderId, OrderStatus.Cancelled, null, ct);
                    await _botService.AnswerCallbackQueryAsync(query.Id, $"❌ سفارش {updated.Number} لغو گردید.", showAlert: false, ct);
                    await UpdateMessageAfterStatusChangeAsync(query, updated, "❌ لغو شده", ct);
                    break;
                }
                case "refresh":
                {
                    var allOrders = await _storeService.OrdersAsync(null, ct);
                    var current = allOrders.FirstOrDefault(x => x.Id == orderId);
                    if (current is null)
                    {
                        await _botService.AnswerCallbackQueryAsync(query.Id, "سفارش یافت نشد.", showAlert: true, ct);
                        return;
                    }
                    var statusPersian = GetPersianStatusText(current.Status);
                    await _botService.AnswerCallbackQueryAsync(query.Id, $"وضعیت فعلی: {statusPersian}", showAlert: false, ct);
                    await UpdateMessageAfterStatusChangeAsync(query, current, statusPersian, ct);
                    break;
                }
                default:
                    await _botService.AnswerCallbackQueryAsync(query.Id, "عملیات ناشناخته.", showAlert: false, ct);
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Telegram callback query {Data}", data);
            await _botService.AnswerCallbackQueryAsync(query.Id, "⚠️ خطا در پردازش سفارش: " + ex.Message, showAlert: true, ct);
        }
    }

    private async Task HandleMessageAsync(TelegramMessage message, CancellationToken ct)
    {
        var senderId = message.From?.Id ?? message.Chat.Id;
        if (!_options.IsAdmin(senderId))
        {
            _logger.LogWarning("Unauthorized message attempt from Telegram User ID {UserId} ({Username}): {Text}", senderId, message.From?.Username, message.Text);
            await _botService.SendMessageAsync(message.Chat.Id, "⛔ <b>دسترسی غیرمجاز</b>\nشما به پنل مدیریت ترمه دسترسی ندارید.", null, ct);
            return;
        }

        var text = (message.Text ?? string.Empty).Trim();
        var command = text.Split(' ', '@')[0].ToLowerInvariant();

        switch (command)
        {
            case "/start":
            case "/help":
                await SendHelpMessageAsync(message.Chat.Id, ct);
                break;

            case "/today":
            case "/stats":
                await SendTodayStatsAsync(message.Chat.Id, ct);
                break;

            case "/pending":
                await SendPendingOrdersAsync(message.Chat.Id, ct);
                break;

            case "/order":
                await SendOrderDetailsAsync(message.Chat.Id, text, ct);
                break;

            default:
                if (text.StartsWith('/'))
                {
                    await _botService.SendMessageAsync(message.Chat.Id, "دستور نامعتبر است. برای راهنما /help را ارسال کنید.", null, ct);
                }
                break;
        }
    }

    private async Task SendHelpMessageAsync(long chatId, CancellationToken ct)
    {
        var helpText = """
            🤖 <b>ربات مدیریت فروشگاه ترمه</b>
            به پنل مدیریت تلگرامی ترمه خوش آمدید.
            
            📌 <b>دستورات در دسترس:</b>
            📊 <code>/today</code> یا <code>/stats</code> — گزارش فروش، آمار و وضعیت سفارشات امروز
            ⏳ <code>/pending</code> — لیست ۵ سفارش اخیر در انتظار تایید با دکمه‌های عملیاتی
            🔍 <code>/order [شماره سفارش]</code> — جستجو و نمایش جزئیات کامل سفارش
            ❓ <code>/help</code> — راهنمای استفاده
            
            <i>🔔 کلیه سفارشات جدید نیز به صورت آنی به این چت ارسال خواهند شد.</i>
            """;

        await _botService.SendMessageAsync(chatId, helpText, null, ct);
    }

    private async Task SendTodayStatsAsync(long chatId, CancellationToken ct)
    {
        try
        {
            var dashboard = await _storeService.DashboardAsync(ct);
            var orders = await _storeService.OrdersAsync(null, ct);

            var nowUtc = DateTime.UtcNow;
            var todayIran = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, IranTimeZone).Date;
            var todayUtcStart = TimeZoneInfo.ConvertTimeToUtc(todayIran, IranTimeZone);

            var todayOrders = orders.Where(x => x.CreatedAt >= todayUtcStart).ToList();
            var todaySales = todayOrders.Where(x => x.Status != OrderStatus.Cancelled && x.Status != OrderStatus.Expired).Sum(x => x.Total);
            var todayPending = todayOrders.Count(x => x.Status == OrderStatus.PendingConfirmation);
            var todayShipped = todayOrders.Count(x => x.Status == OrderStatus.Shipped || x.Status == OrderStatus.Delivered);

            var persianToday = $"{Pc.GetYear(todayIran):0000}/{Pc.GetMonth(todayIran):00}/{Pc.GetDayOfMonth(todayIran):00}";

            var responseText = $"""
                📊 <b>گزارش و آمار ترمه ({persianToday})</b>
                ━━━━━━━━━━━━━━━━━
                💰 <b>فروش موفق امروز:</b> {todaySales:N0} تومان
                🛍 <b>تعداد کل سفارشات امروز:</b> {todayOrders.Count} سفارش
                ⏳ <b>سفارشات جدید در انتظار:</b> {todayPending}
                🚚 <b>سفارشات ارسال شده امروز:</b> {todayShipped}
                
                📋 <b>وضعیت کلی سیستم:</b>
                • سفارشات در انتظار تایید: <b>{dashboard.PendingOrderCount}</b>
                • کالاهای رو به اتمام موجودی: <b>{dashboard.LowStockCount}</b>
                • پیام‌های خوانده نشده تماس: <b>{dashboard.UnreadMessageCount}</b>
                • تعداد کل مشتریان: <b>{dashboard.CustomerCount}</b>
                """;

            await _botService.SendMessageAsync(chatId, responseText, null, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting stats for Telegram bot");
            await _botService.SendMessageAsync(chatId, "⚠️ خطا در دریافت آمار فروش.", null, ct);
        }
    }

    private async Task SendPendingOrdersAsync(long chatId, CancellationToken ct)
    {
        try
        {
            var pendingOrders = await _storeService.OrdersAsync(OrderStatus.PendingConfirmation, ct);
            if (pendingOrders.Count == 0)
            {
                await _botService.SendMessageAsync(chatId, "✅ <b>هیچ سفارشی در انتظار تایید وجود ندارد.</b>", null, ct);
                return;
            }

            await _botService.SendMessageAsync(chatId, $"⏳ <b>تعداد {pendingOrders.Count} سفارش در انتظار تایید یافت شد:</b>", null, ct);

            foreach (var order in pendingOrders.Take(5))
            {
                var iranTime = TimeZoneInfo.ConvertTimeFromUtc(order.CreatedAt, IranTimeZone);
                var itemsText = string.Join("\n", order.Items.Select(i => $"  • {TelegramBotService.Escape(i.ProductName)} ({i.Quantity} عدد)"));

                var text = $"""
                    🔖 <b>سفارش:</b> <code>{TelegramBotService.Escape(order.Number)}</code>
                    👤 <b>مشتری:</b> {TelegramBotService.Escape(order.CustomerName)} (<a href="tel:{order.Phone}">{order.Phone}</a>)
                    📍 <b>شهر:</b> {TelegramBotService.Escape(order.Province)} - {TelegramBotService.Escape(order.City)}
                    💳 <b>مبلغ کل:</b> <b>{order.Total:N0} تومان</b>
                    
                    📦 <b>اقلام:</b>
                    {itemsText}
                    """;

                var keyboard = TelegramBotService.BuildOrderActionKeyboard(order.Id);
                await _botService.SendMessageAsync(chatId, text, keyboard, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching pending orders for Telegram bot");
            await _botService.SendMessageAsync(chatId, "⚠️ خطا در دریافت سفارشات در انتظار.", null, ct);
        }
    }

    private async Task SendOrderDetailsAsync(long chatId, string rawText, CancellationToken ct)
    {
        var match = Regex.Match(rawText, @"/order\s+([A-Za-z0-9\-]+)", RegexOptions.IgnoreCase);
        if (!match.Success)
        {
            await _botService.SendMessageAsync(chatId, "فرمت دستور: <code>/order 123456</code> (شماره سفارش را وارد کنید)", null, ct);
            return;
        }

        var orderNumberOrId = match.Groups[1].Value.Trim();
        var allOrders = await _storeService.OrdersAsync(null, ct);
        var order = allOrders.FirstOrDefault(x =>
            string.Equals(x.Number, orderNumberOrId, StringComparison.OrdinalIgnoreCase) ||
            x.Id.ToString().Equals(orderNumberOrId, StringComparison.OrdinalIgnoreCase));

        if (order is null)
        {
            await _botService.SendMessageAsync(chatId, $"❌ سفارشی با شماره یا شناسه <code>{TelegramBotService.Escape(orderNumberOrId)}</code> یافت نشد.", null, ct);
            return;
        }

        var iranTime = TimeZoneInfo.ConvertTimeFromUtc(order.CreatedAt, IranTimeZone);
        var persianDate = $"{Pc.GetYear(iranTime):0000}/{Pc.GetMonth(iranTime):00}/{Pc.GetDayOfMonth(iranTime):00} - {iranTime:HH:mm}";
        var statusPersian = GetPersianStatusText(order.Status);

        var itemsSummary = string.Join("\n", order.Items.Select(item =>
            $"  ▫️ <b>{TelegramBotService.Escape(item.ProductName)}</b> ({TelegramBotService.Escape(item.Sku)})\n" +
            $"     تعداد: <b>{item.Quantity}</b> × <b>{item.UnitPrice:N0} تومان</b> = <b>{(item.UnitPrice * item.Quantity):N0} تومان</b>"));

        var notes = !string.IsNullOrWhiteSpace(order.CustomerNotes)
            ? $"\n📝 <b>یادداشت:</b> <i>{TelegramBotService.Escape(order.CustomerNotes)}</i>"
            : string.Empty;

        var tracking = !string.IsNullOrWhiteSpace(order.PostalTrackingCode)
            ? $"\n📮 <b>کد رهگیری پستی:</b> <code>{TelegramBotService.Escape(order.PostalTrackingCode)}</code>"
            : string.Empty;

        var text = $"""
            🔖 <b>جزئیات سفارش:</b> <code>{TelegramBotService.Escape(order.Number)}</code>
            📅 <b>تاریخ:</b> {persianDate}
            ⚙️ <b>وضعیت فعلی:</b> <b>{statusPersian}</b>{tracking}
            
            👤 <b>مشتری:</b> {TelegramBotService.Escape(order.CustomerName)}
            📞 <b>شماره:</b> <a href="tel:{order.Phone}">{order.Phone}</a>
            📍 <b>آدرس:</b> {TelegramBotService.Escape(order.Province)} - {TelegramBotService.Escape(order.City)}, {TelegramBotService.Escape(order.Address)}
            📮 <b>کد پستی:</b> <code>{TelegramBotService.Escape(order.PostalCode)}</code>{notes}
            
            📦 <b>اقلام:</b>
            {itemsSummary}
            
            💳 <b>مبلغ کل:</b> <b>{order.Total:N0} تومان</b>
            """;

        var keyboard = TelegramBotService.BuildOrderActionKeyboard(order.Id);
        await _botService.SendMessageAsync(chatId, text, keyboard, ct);
    }

    private async Task UpdateMessageAfterStatusChangeAsync(TelegramCallbackQuery query, AdminOrderDto order, string statusLabel, CancellationToken ct)
    {
        if (query.Message is null) return;

        var currentText = query.Message.Text ?? string.Empty;
        var lines = currentText.Split('\n').ToList();
        var statusLineIndex = lines.FindIndex(l => l.Contains("وضعیت کنونی") || l.Contains("وضعیت فعلی") || l.Contains("⚙️"));

        string updatedText;
        if (statusLineIndex >= 0)
        {
            lines[statusLineIndex] = $"⚙️ <b>وضعیت:</b> {statusLabel}";
            updatedText = string.Join('\n', lines);
        }
        else
        {
            updatedText = $"{currentText}\n\n⚙️ <b>وضعیت جدید:</b> {statusLabel}";
        }

        var keyboard = TelegramBotService.BuildOrderActionKeyboard(order.Id);
        await _botService.EditMessageTextAsync(query.Message.Chat.Id, query.Message.MessageId, updatedText, keyboard, ct);
    }

    private static string GetPersianStatusText(OrderStatus status) => status switch
    {
        OrderStatus.PendingConfirmation => "⏳ در انتظار تایید",
        OrderStatus.Confirmed => "✅ تایید شده",
        OrderStatus.Preparing => "📦 در حال آماده‌سازی",
        OrderStatus.Shipped => "🚚 ارسال شده",
        OrderStatus.Delivered => "📬 تحویل داده شده",
        OrderStatus.Cancelled => "❌ لغو شده",
        OrderStatus.Expired => "⌛ منقضی شده",
        _ => status.ToString()
    };
}
