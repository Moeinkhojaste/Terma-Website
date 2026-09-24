using Terma.Domain.Common;

namespace Terma.Domain.Entities;

public sealed class StoreSetting : BaseEntity
{
    public string Key { get; private set; } = string.Empty;
    public string Value { get; private set; } = string.Empty;
    public string? Description { get; private set; }

    private StoreSetting() { }

    public StoreSetting(string key, string value, string? description = null)
    {
        Key = key.Trim();
        Value = value.Trim();
        Description = description?.Trim();
    }

    public StoreSetting(Guid id, string key, string value, string? description = null)
    {
        Id = id;
        Key = key.Trim();
        Value = value.Trim();
        Description = description?.Trim();
    }

    public void UpdateValue(string value)
    {
        Value = value.Trim();
        MarkUpdated();
    }
}
