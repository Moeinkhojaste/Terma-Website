using System.Text.Json.Serialization;

namespace Terma.Domain.Entities;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ShippingMethod
{
    Pishtaz,
    Tipax
}
