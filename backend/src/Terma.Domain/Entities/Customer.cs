using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class Customer : BaseEntity
{
    public string FullName { get; private set; } = string.Empty;
    public string NormalizedPhone { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public int OrderCount { get; private set; }
    public decimal TotalOrderValue { get; private set; }

    private Customer() { }

    public Customer(string fullName, string phone, string? email)
    {
        FullName = fullName.Trim();
        Phone = phone.Trim();
        NormalizedPhone = NormalizePhone(phone);
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
    }

    public void RefreshProfile(string fullName, string phone, string? email)
    {
        FullName = fullName.Trim();
        Phone = phone.Trim();
        NormalizedPhone = NormalizePhone(phone);
        Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        MarkUpdated();
    }

    public void AddOrder(decimal total)
    {
        OrderCount++;
        TotalOrderValue += total;
        MarkUpdated();
    }

    private static string NormalizePhone(string phone) => new string(phone.Where(char.IsDigit).ToArray()).TrimStart('0');
}
