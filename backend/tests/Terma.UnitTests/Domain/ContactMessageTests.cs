using Terma.Domain.Entities;

namespace Terma.UnitTests.Domain;

public sealed class ContactMessageTests
{
    [Fact]
    public void Constructor_SetsPropertiesAndInitialStatusIsNew()
    {
        var msg = new ContactMessage("محمدرضا", "09121112233", "mohammad@example.com", "پیگیری سفارش", "سلام، وضعیت سفارش من در چه مرحله‌ای است؟");

        Assert.Equal("محمدرضا", msg.Name);
        Assert.Equal("09121112233", msg.Phone);
        Assert.Equal("mohammad@example.com", msg.Email);
        Assert.Equal("پیگیری سفارش", msg.Topic);
        Assert.Equal("سلام، وضعیت سفارش من در چه مرحله‌ای است؟", msg.Body);
        Assert.Equal(ContactMessageStatus.New, msg.Status);
    }

    [Fact]
    public void ChangeStatus_UpdatesStatus()
    {
        var msg = new ContactMessage("نام", "0912", null, "موضوع", "متن");
        msg.ChangeStatus(ContactMessageStatus.Read);
        Assert.Equal(ContactMessageStatus.Read, msg.Status);

        msg.ChangeStatus(ContactMessageStatus.Replied);
        Assert.Equal(ContactMessageStatus.Replied, msg.Status);
    }
}
