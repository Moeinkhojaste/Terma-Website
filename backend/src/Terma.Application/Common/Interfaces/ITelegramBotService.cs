using Terma.Application.Telegram;

namespace Terma.Application.Common.Interfaces;

public interface ITelegramBotService
{
    Task NotifyNewOrderAsync(OrderNotificationDto order, CancellationToken ct = default);
    Task SendMessageAsync(long chatId, string htmlText, object? replyMarkup = null, CancellationToken ct = default);
    Task EditMessageTextAsync(long chatId, int messageId, string htmlText, object? replyMarkup = null, CancellationToken ct = default);
    Task AnswerCallbackQueryAsync(string callbackQueryId, string? alertText = null, bool showAlert = false, CancellationToken ct = default);
}
