using Terma.Domain.Common;
using Terma.Domain.Exceptions;
using Terma.Domain.Services;

namespace Terma.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public string FullName { get; private set; } = string.Empty;
    public string NormalizedPhone { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public int OrderCount { get; private set; }
    public decimal TotalOrderValue { get; private set; }
    public Guid? UserId { get; private set; }

    private Customer() { }

    public Customer(string fullName, string phone, string? email)
    {
        FullName = fullName.Trim();
        Phone = phone.Trim();
        NormalizedPhone = IranianPhoneNumber.Normalize(phone);
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
    }

    public void RefreshProfile(string fullName, string phone, string? email)
    {
        FullName = fullName.Trim();
        Phone = phone.Trim();
        NormalizedPhone = IranianPhoneNumber.Normalize(phone);
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        MarkUpdated();
    }

    public void AddOrder(decimal total)
    {
        OrderCount++;
        TotalOrderValue += total;
        MarkUpdated();
    }

    public void AttachToUser(Guid userId)
    {
        if (UserId.HasValue && UserId.Value != userId)
            throw new DomainException("This customer is already linked to another account.");
        if (UserId == userId) return;
        UserId = userId;
        MarkUpdated();
    }
}
