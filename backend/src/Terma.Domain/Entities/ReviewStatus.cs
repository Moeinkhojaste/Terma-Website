using System.Text.Json.Serialization;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ReviewStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}
