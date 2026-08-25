namespace Terma.Application.Telegram;

public interface ITelegramUpdateHandler
{
    Task HandleUpdateAsync(TelegramUpdate update, CancellationToken ct = default);
}
