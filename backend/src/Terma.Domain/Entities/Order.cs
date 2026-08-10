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
    public string Number { get; private set; } = string.Empty;
    public Guid CustomerId { get; private set; }
    public Customer Customer { get; private set; } = null!;
    public OrderStatus Status { get; private set; } = OrderStatus.PendingConfirmation;
    public string FullNameSnapshot { get; private set; } = string.Empty;
    public string PhoneSnapshot { get; private set; } = string.Empty;
    public string? EmailSnapshot { get; private set; }
    public string Province { get; private set; } = string.Empty;
    public string City { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string PostalCode { get; private set; } = string.Empty;
    public decimal Subtotal { get; private set; }
    public decimal DiscountTotal { get; private set; }
    public decimal ShippingTotal { get; private set; }
    public decimal Total { get; private set; }
    public DateTime ReservationExpiresAtUtc { get; private set; }
    public string TrackingTokenHash { get; private set; } = string.Empty;
    public string? IdempotencyKey { get; private set; }
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();
    public IReadOnlyCollection<OrderStatusHistory> History => _history.AsReadOnly();

    private Order() { }

    public Order(string number, Customer customer, string province, string city, string address,
        string postalCode, decimal subtotal, decimal discountTotal, decimal shippingTotal,
        DateTime reservationExpiresAtUtc, string trackingTokenHash)
    {
        Number = number;
        Customer = customer;
        CustomerId = customer.Id;
        FullNameSnapshot = customer.FullName;
        PhoneSnapshot = customer.Phone;
        EmailSnapshot = customer.Email;
        Province = province.Trim();
        City = city.Trim();
        Address = address.Trim();
        PostalCode = postalCode.Trim();
        Subtotal = subtotal;
        DiscountTotal = discountTotal;
        ShippingTotal = shippingTotal;
        Total = subtotal - discountTotal + shippingTotal;
        ReservationExpiresAtUtc = reservationExpiresAtUtc;
        TrackingTokenHash = trackingTokenHash;
        _history.Add(new OrderStatusHistory(Id, OrderStatus.PendingConfirmation, DateTime.UtcNow));
    }

    public void AddItem(OrderItem item) => _items.Add(item);
    public void SetIdempotencyKey(string key) { IdempotencyKey = key.Trim(); }

    public void ChangeStatus(OrderStatus next)
    {
        if (Status == next) return;
        if (Status is OrderStatus.Delivered or OrderStatus.Cancelled or OrderStatus.Expired)
            throw new DomainException("This order cannot change status anymore.");
        if (next == OrderStatus.PendingConfirmation)
            throw new DomainException("An order cannot return to pending confirmation.");
        Status = next;
        _history.Add(new OrderStatusHistory(Id, next, DateTime.UtcNow));
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
    public OrderStatusHistory(Guid orderId, OrderStatus status, DateTime createdAt) { Id = Guid.Empty; OrderId = orderId; Status = status; }
}
