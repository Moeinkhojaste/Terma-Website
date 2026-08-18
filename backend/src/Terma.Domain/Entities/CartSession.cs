using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class CartSession : BaseEntity
{
    public string SessionKey { get; private set; } = string.Empty;
    public Guid? UserId { get; private set; }
    public Guid? CustomerId { get; private set; }
    public string? CustomerName { get; private set; }
    public string? Phone { get; private set; }
    public string? Email { get; private set; }
    public string ItemsJson { get; private set; } = "[]";
    public int ItemCount { get; private set; }
    public decimal TotalValue { get; private set; }
    public DateTime LastActivityAtUtc { get; private set; }
    public bool IsRecovered { get; private set; }

    private CartSession() { }

    public CartSession(
        string sessionKey,
        string itemsJson,
        int itemCount,
        decimal totalValue,
        Guid? userId = null,
        Guid? customerId = null,
        string? customerName = null,
        string? phone = null,
        string? email = null)
    {
        SessionKey = sessionKey.Trim();
        ItemsJson = itemsJson;
        ItemCount = itemCount;
        TotalValue = totalValue;
        UserId = userId;
        CustomerId = customerId;
        CustomerName = string.IsNullOrWhiteSpace(customerName) ? null : customerName.Trim();
        Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        LastActivityAtUtc = DateTime.UtcNow;
        IsRecovered = false;
    }

    public void UpdateActivity(
        string itemsJson,
        int itemCount,
        decimal totalValue,
        Guid? userId = null,
        Guid? customerId = null,
        string? customerName = null,
        string? phone = null,
        string? email = null)
    {
        ItemsJson = itemsJson;
        ItemCount = itemCount;
        TotalValue = totalValue;
        if (userId.HasValue) UserId = userId.Value;
        if (customerId.HasValue) CustomerId = customerId.Value;
        if (!string.IsNullOrWhiteSpace(customerName)) CustomerName = customerName.Trim();
        if (!string.IsNullOrWhiteSpace(phone)) Phone = phone.Trim();
        if (!string.IsNullOrWhiteSpace(email)) Email = email.Trim();
        LastActivityAtUtc = DateTime.UtcNow;
        MarkUpdated();
    }

    public void MarkRecovered()
    {
        IsRecovered = true;
        MarkUpdated();
    }
}
