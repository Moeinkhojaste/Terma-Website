using System.Text.Json.Serialization;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum PackagingType
{
    Standard = 0,
    GiftBox = 1
}
