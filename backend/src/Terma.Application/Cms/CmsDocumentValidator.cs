using System.Text.Json;
using FluentValidation;

namespace Terma.Application.Cms;

public static class CmsDocumentValidator
{
    public static readonly IReadOnlySet<string> AllowedBlockTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        "hero", "announcement", "richText", "imageText", "featureGrid", "faq", "cta",
        "contactInfo", "linkList", "productShowcase", "categoryLinks"
    };

    public static void Validate(CmsDocumentDto document)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();
        if (document.SchemaVersion != 1) failures.Add(new("document.schemaVersion", "Only CMS schema version 1 is supported."));
        if (document.Blocks.Count > 50) failures.Add(new("document.blocks", "A page can contain at most 50 blocks."));
        if (document.Seo.Title.Length > 300) failures.Add(new("document.seo.title", "SEO title can contain at most 300 characters."));
        if (document.Seo.Description.Length > 1000) failures.Add(new("document.seo.description", "SEO description can contain at most 1000 characters."));
        ValidateUrl(document.Seo.CanonicalPath, "document.seo.canonicalPath", failures, allowRelativeOnly: true);
        ValidateMediaUrl(document.Seo.OgImageUrl, "document.seo.ogImageUrl", failures);

        var ids = new HashSet<string>(StringComparer.Ordinal);
        for (var index = 0; index < document.Blocks.Count; index++)
        {
            var block = document.Blocks[index];
            var prefix = $"document.blocks[{index}]";
            if (!Guid.TryParse(block.Id, out _) || !ids.Add(block.Id)) failures.Add(new($"{prefix}.id", "Each block needs a unique GUID id."));
            if (!AllowedBlockTypes.Contains(block.Type)) failures.Add(new($"{prefix}.type", $"Block type '{block.Type}' is not allowed."));
            if (block.Data.ValueKind != JsonValueKind.Object) failures.Add(new($"{prefix}.data", "Block data must be an object."));
            if (block.Data.GetRawText().Length > 50_000) failures.Add(new($"{prefix}.data", "Block content is too large."));
            ValidateJson(block.Data, prefix, failures);
        }

        if (failures.Count > 0) throw new ValidationException(failures);
    }

    private static void ValidateJson(JsonElement value, string path, List<FluentValidation.Results.ValidationFailure> failures)
    {
        if (value.ValueKind == JsonValueKind.Object)
        {
            foreach (var property in value.EnumerateObject())
            {
                var propertyPath = $"{path}.data.{property.Name}";
                if (property.Value.ValueKind == JsonValueKind.String)
                {
                    var text = property.Value.GetString() ?? string.Empty;
                    if (text.Length > 12_000) failures.Add(new(propertyPath, "Text value is too long."));
                    if (property.Name.EndsWith("Url", StringComparison.OrdinalIgnoreCase) || property.Name.Equals("href", StringComparison.OrdinalIgnoreCase))
                    {
                        if (property.Name.Contains("image", StringComparison.OrdinalIgnoreCase) || property.Name.Contains("logo", StringComparison.OrdinalIgnoreCase))
                            ValidateMediaUrl(text, propertyPath, failures);
                        else ValidateUrl(text, propertyPath, failures, false);
                    }
                }
                else if (property.Value.ValueKind is JsonValueKind.Object or JsonValueKind.Array)
                {
                    ValidateJson(property.Value, propertyPath, failures);
                }
            }
        }
        else if (value.ValueKind == JsonValueKind.Array)
        {
            if (value.GetArrayLength() > 30) failures.Add(new(path, "A block list can contain at most 30 items."));
            var index = 0;
            foreach (var item in value.EnumerateArray()) ValidateJson(item, $"{path}[{index++}]", failures);
        }
    }

    private static void ValidateMediaUrl(string? value, string path, List<FluentValidation.Results.ValidationFailure> failures)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        if (!value.StartsWith("/api/media/", StringComparison.OrdinalIgnoreCase) && !value.StartsWith("/images/", StringComparison.OrdinalIgnoreCase))
            failures.Add(new(path, "Images must come from the media library or approved public images."));
    }

    private static void ValidateUrl(string? value, string path, List<FluentValidation.Results.ValidationFailure> failures, bool allowRelativeOnly)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        if (value.StartsWith('/') && !value.StartsWith("//")) return;
        if (!allowRelativeOnly && Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.Scheme is "https" or "mailto" or "tel") return;
        failures.Add(new(path, allowRelativeOnly ? "Path must start with /." : "Link must be a relative path, HTTPS, mailto or tel URL."));
    }
}
