namespace Terma.Infrastructure.Telegram;

public sealed class TelegramOptions
{
    public const string SectionName = "Telegram";

    public string? BotToken { get; set; }
    public string? AdminChatId { get; set; }
    public string? WebhookSecret { get; set; }
    public bool Enabled { get; set; } = true;
    public bool UsePolling { get; set; } = true;

    public bool IsConfigured => Enabled && !string.IsNullOrWhiteSpace(BotToken);

    public HashSet<long> GetAdminChatIds()
    {
        var result = new HashSet<long>();
        if (string.IsNullOrWhiteSpace(AdminChatId)) return result;

        var parts = AdminChatId.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var part in parts)
        {
            if (long.TryParse(part, out var id))
            {
                result.Add(id);
            }
        }
        return result;
    }

    public bool IsAdmin(long chatId)
    {
        var ids = GetAdminChatIds();
        return ids.Contains(chatId);
    }
}
