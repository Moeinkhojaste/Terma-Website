using System.Text.Json.Serialization;
using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum OrderStatus { PendingConfirmation, Confirmed, Preparing, Shipped, Delivered, Cancelled, Expired }

public sealed class Order : BaseEntity
{
    private readonly List<OrderItem> _items = [];
    private readonly List<OrderStatusHistory> _history = [];
    private readonly List<PaymentTransaction> _payments = [];
    public string Number { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public Guid? UserId { get; private set; }
    public OrderStatus Status { get; private set; } = OrderStatus.PendingConfirmation;
    public string FullNameSnapshot { get; private set; } = string.Empty;
    public string PhoneSnapshot { get; private set; } = string.Empty;
    public string? EmailSnapshot { get; private set; }
    public string Province { get; private set; } = string.Empty;
    public string City { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string PostalCode { get; private set; } = string.Empty;
    public string? CustomerNotes { get; private set; }
    public decimal Subtotal { get; private set; }
    public decimal DiscountTotal { get; private set; }
    public decimal ShippingTotal { get; private set; }
    public decimal Total { get; private set; }
    public DateTime ReservationExpiresAtUtc { get; private set; }
    public string? TrackingTokenHash { get; private set; }
    public string? PostalTrackingCode { get; private set; }
    public string? IdempotencyKey { get; private set; }
    public string? RequestFingerprint { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    public IReadOnlyCollection<OrderStatusHistory> History => _history.AsReadOnly();
    public IReadOnlyCollection<PaymentTransaction> Payments => _payments.AsReadOnly();

    private Order() { }

    public Order(string number, Customer customer, string province, string city, string address,
        string postalCode, decimal subtotal, decimal discountTotal, decimal shippingTotal,
        DateTime reservationExpiresAtUtc, string? trackingTokenHash = null, string? customerNotes = null)
    {
        Number = number.Trim();
        Customer = customer;
        CustomerId = customer.Id;
        FullNameSnapshot = customer.FullName;
        PhoneSnapshot = customer.Phone;
        EmailSnapshot = customer.Email;
        Province = province.Trim();
        City = city.Trim();
        Address = address.Trim();
        PostalCode = postalCode.Trim();
        CustomerNotes = string.IsNullOrWhiteSpace(customerNotes) ? null : customerNotes.Trim();
        Subtotal = subtotal;
        DiscountTotal = discountTotal;
        ShippingTotal = shippingTotal;
        Total = subtotal - discountTotal + shippingTotal;
        ReservationExpiresAtUtc = reservationExpiresAtUtc;
        TrackingTokenHash = trackingTokenHash;
        _history.Add(new OrderStatusHistory(Id, OrderStatus.PendingConfirmation, DateTime.UtcNow));
    }

    public void AddItem(OrderItem item) => _items.Add(item);
    public void AddPayment(PaymentTransaction payment) => _payments.Add(payment);

    public void ConfirmPayment(long refId)
    {
        if (Status == OrderStatus.PendingConfirmation)
        {
            ChangeStatus(OrderStatus.Confirmed);
        }
    }

    public void SetIdempotency(string key, string requestFingerprint)
    {
        IdempotencyKey = key.Trim();
        RequestFingerprint = requestFingerprint.Trim();
        MarkUpdated();
    }

    public void SetIdempotencyKey(string key)
    {
        IdempotencyKey = key.Trim();
        MarkUpdated();
    }

    public void AttachToUser(Guid userId)
    {
        if (UserId.HasValue && UserId.Value != userId)
            throw new DomainException("This order is already linked to another account.");
        if (UserId == userId) return;
        UserId = userId;
        MarkUpdated();
    }

    public bool CanTransitionTo(OrderStatus next)
    {
        if (Status == next) return true;

        return Status switch
        {
            OrderStatus.PendingConfirmation => next is OrderStatus.Confirmed or OrderStatus.Preparing or OrderStatus.Shipped or OrderStatus.Cancelled or OrderStatus.Expired,
            OrderStatus.Confirmed => next is OrderStatus.Preparing or OrderStatus.Shipped or OrderStatus.Cancelled,
            OrderStatus.Preparing => next is OrderStatus.Shipped or OrderStatus.Cancelled,
            OrderStatus.Shipped => next is OrderStatus.Delivered or OrderStatus.Cancelled,
            OrderStatus.Expired => next is OrderStatus.Confirmed or OrderStatus.Cancelled,
            OrderStatus.Cancelled => next is OrderStatus.Confirmed or OrderStatus.PendingConfirmation,
            OrderStatus.Delivered => false,
            _ => false
        };
    }

    public void ChangeStatus(OrderStatus next)
    {
        if (Status == next) return;
        if (!CanTransitionTo(next))
            throw new DomainException($"Cannot transition order from status '{Status}' to '{next}'.");

        Status = next;
        MarkUpdated();
    }

    public void SetPostalTrackingCode(string? trackingCode)
    {
        var normalized = string.IsNullOrWhiteSpace(trackingCode) ? null : trackingCode.Trim();
        if (PostalTrackingCode == normalized) return;
        PostalTrackingCode = normalized;
        MarkUpdated();
    }
}

public sealed class OrderItem : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Order Order { get; private set; } = null!;
    public Guid ProductId { get; private set; }
    public Guid? VariantId { get; private set; }
    public string ProductName { get; private set; } = string.Empty;
    public string Sku { get; private set; } = string.Empty;
    public decimal UnitPrice { get; private set; }
    public int Quantity { get; private set; }
    public decimal LineTotal => UnitPrice * Quantity;
    private OrderItem() { }
    public OrderItem(Guid productId, Guid? variantId, string productName, string sku, decimal unitPrice, int quantity)
    {
        ProductId = productId; VariantId = variantId; ProductName = productName.Trim(); Sku = sku.Trim(); UnitPrice = unitPrice; Quantity = quantity;
    }
}

public sealed class OrderStatusHistory : BaseEntity
{
    public Guid OrderId { get; private set; }
    public Order Order { get; private set; } = null!;
    public OrderStatus Status { get; private set; }
    private OrderStatusHistory() { }
    public OrderStatusHistory(Guid orderId, OrderStatus status, DateTime createdAt) { Id = Guid.NewGuid(); OrderId = orderId; Status = status; }
}
