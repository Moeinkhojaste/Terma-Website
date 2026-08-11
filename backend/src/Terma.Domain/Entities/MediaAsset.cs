using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public sealed class MediaAsset : BaseEntity
{
    public string StorageKey { get; private set; } = string.Empty;
    public string PublicUrl { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string AltText { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long Length { get; private set; }

    private MediaAsset() { }

    public MediaAsset(string storageKey, string publicUrl, string name, string altText, string contentType, long length)
    {
        StorageKey = Required(storageKey, "Storage key", 260);
        PublicUrl = Required(publicUrl, "Public URL", 1024);
        ContentType = Required(contentType, "Content type", 100);
        Length = length > 0 ? length : throw new DomainException("Media length must be positive.");
        Update(name, altText);
    }

    public void Update(string name, string altText)
    {
        Name = Required(name, "Media name", 240);
        AltText = Required(altText, "Alternative text", 500);
        MarkUpdated();
    }

    private static string Required(string value, string field, int maxLength)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (normalized.Length == 0 || normalized.Length > maxLength) throw new DomainException($"{field} is required and must be at most {maxLength} characters.");
        return normalized;
    }
}
