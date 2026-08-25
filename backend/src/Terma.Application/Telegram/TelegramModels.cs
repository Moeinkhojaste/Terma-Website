using System.Text.Json.Serialization;

namespace Terma.Application.Telegram;

public sealed record OrderNotificationDto(
    Guid OrderId,
    string OrderNumber,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    string Province,
    string City,
    string Address,
    string PostalCode,
    string? CustomerNotes,
    decimal Subtotal,
    decimal DiscountTotal,
    decimal ShippingTotal,
    decimal TotalAmount,
    IReadOnlyList<OrderNotificationItemDto> Items,
    DateTime CreatedAtUtc
);

public sealed record OrderNotificationItemDto(
    Guid ProductId,
    Guid? VariantId,
    string ProductName,
    string Sku,
    string? VariantTitle = null,
    string? Color = null,
    int? TableCapacity = null,
    decimal? Length = null,
    decimal? Width = null,
    string? FabricType = null,
    string? LiningType = null,
    string? Pattern = null,
    decimal UnitPrice = 0,
    int Quantity = 1
);

public sealed class TelegramApiResponse<T>
{
    [JsonPropertyName("ok")]
    public bool Ok { get; set; }

    [JsonPropertyName("result")]
    public T? Result { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

// Telegram Webhook / Polling Update Structures
public sealed class TelegramUpdate
{
    [JsonPropertyName("update_id")]
    public long UpdateId { get; set; }

    [JsonPropertyName("message")]
    public TelegramMessage? Message { get; set; }

    [JsonPropertyName("callback_query")]
    public TelegramCallbackQuery? CallbackQuery { get; set; }
}

public sealed class TelegramMessage
{
    [JsonPropertyName("message_id")]
    public int MessageId { get; set; }

    [JsonPropertyName("from")]
    public TelegramUser? From { get; set; }

    [JsonPropertyName("chat")]
    public TelegramChat Chat { get; set; } = null!;

    [JsonPropertyName("date")]
    public long Date { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }
}

public sealed class TelegramCallbackQuery
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("from")]
    public TelegramUser From { get; set; } = null!;

    [JsonPropertyName("message")]
    public TelegramMessage? Message { get; set; }

    [JsonPropertyName("data")]
    public string? Data { get; set; }
}

public sealed class TelegramUser
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("is_bot")]
    public bool IsBot { get; set; }

    [JsonPropertyName("first_name")]
    public string FirstName { get; set; } = string.Empty;

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }
}

public sealed class TelegramChat
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("username")]
    public string? Username { get; set; }

    [JsonPropertyName("first_name")]
    public string? FirstName { get; set; }

    [JsonPropertyName("last_name")]
    public string? LastName { get; set; }
}
