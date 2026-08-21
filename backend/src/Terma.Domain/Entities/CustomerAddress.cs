using Terma.Domain.Common;
using Terma.Domain.Exceptions;
using Terma.Domain.Services;

namespace Terma.Domain.Entities;

public sealed class CustomerAddress : BaseEntity
{
    public Guid UserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string ReceiverName { get; private set; } = string.Empty;
    public string ReceiverPhone { get; private set; } = string.Empty;
    public string Province { get; private set; } = string.Empty;
    public string City { get; private set; } = string.Empty;
    public string Address { get; private set; } = string.Empty;
    public string PostalCode { get; private set; } = string.Empty;
    public bool IsDefault { get; private set; }

    private CustomerAddress() { }

    public CustomerAddress(
        Guid userId,
        string title,
        string receiverName,
        string receiverPhone,
        string province,
        string city,
        string address,
        string postalCode,
        bool isDefault = false)
    {
        if (userId == Guid.Empty) throw new DomainException("UserId cannot be empty.");
        UserId = userId;
        Update(title, receiverName, receiverPhone, province, city, address, postalCode, isDefault);
    }

    public void Update(
        string title,
        string receiverName,
        string receiverPhone,
        string province,
        string city,
        string address,
        string postalCode,
        bool isDefault)
    {
        if (string.IsNullOrWhiteSpace(receiverName))
            throw new DomainException("نام تحویل‌گیرنده نمی‌تواند خالی باشد.");
        if (string.IsNullOrWhiteSpace(receiverPhone))
            throw new DomainException("شماره تماس تحویل‌گیرنده نمی‌تواند خالی باشد.");
        if (string.IsNullOrWhiteSpace(province))
            throw new DomainException("استان نمی‌تواند خالی باشد.");
        if (string.IsNullOrWhiteSpace(city))
            throw new DomainException("شهر نمی‌تواند خالی باشد.");
        if (string.IsNullOrWhiteSpace(address))
            throw new DomainException("آدرس پستی نمی‌تواند خالی باشد.");
        if (string.IsNullOrWhiteSpace(postalCode))
            throw new DomainException("کد پستی نمی‌تواند خالی باشد.");

        Title = string.IsNullOrWhiteSpace(title) ? "آدرس من" : title.Trim();
        ReceiverName = receiverName.Trim();
        ReceiverPhone = receiverPhone.Trim();
        Province = province.Trim();
        City = city.Trim();
        Address = address.Trim();
        PostalCode = postalCode.Trim();
        IsDefault = isDefault;
        MarkUpdated();
    }

    public void SetDefault(bool isDefault)
    {
        if (IsDefault == isDefault) return;
        IsDefault = isDefault;
        MarkUpdated();
    }
}
