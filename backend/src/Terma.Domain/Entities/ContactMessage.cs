using System.Text.Json.Serialization;
using Terma.Domain.Common;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ContactMessageStatus { New, Read, Replied, Archived }

public sealed class ContactMessage : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string? Email { get; private set; }
    public string Topic { get; private set; } = string.Empty;
    public string Body { get; private set; } = string.Empty;
    public ContactMessageStatus Status { get; private set; } = ContactMessageStatus.New;
    private ContactMessage() { }
    public ContactMessage(string name, string phone, string? email, string topic, string body)
    { Name = name.Trim(); Phone = phone.Trim(); Email = email?.Trim(); Topic = topic.Trim(); Body = body.Trim(); }
    public void ChangeStatus(ContactMessageStatus status) { Status = status; MarkUpdated(); }
}
