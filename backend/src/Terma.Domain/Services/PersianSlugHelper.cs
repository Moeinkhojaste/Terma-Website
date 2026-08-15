using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Services;

public static class PersianSlugHelper
{
    private static readonly Regex MultipleHyphensRegex = new(@"[-]+", RegexOptions.Compiled);
    private static readonly Regex InvalidCharsRegex = new(@"[^\u0600-\u06FF\uFB8A\u067E\u0686\u06AF\u06CCa-z0-9\-_]", RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static string GenerateSlug(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new DomainException("Slug input text cannot be empty.");

        var normalized = NormalizePersianText(text.Trim().ToLowerInvariant());
        normalized = InvalidCharsRegex.Replace(normalized, "-");
        normalized = MultipleHyphensRegex.Replace(normalized, "-").Trim('-');

        if (string.IsNullOrWhiteSpace(normalized))
        {
            normalized = "item-" + Guid.NewGuid().ToString("N")[..8];
        }

        return normalized.Length > 160 ? normalized[..160].TrimEnd('-') : normalized;
    }

    public static string NormalizeSlug(string slug)
    {
        if (string.IsNullOrWhiteSpace(slug))
            throw new DomainException("Slug cannot be empty.");

        var normalized = GenerateSlug(slug);
        if (string.IsNullOrWhiteSpace(normalized))
            throw new DomainException("Invalid slug format.");

        return normalized;
    }

    private static string NormalizePersianText(string text)
    {
        var sb = new StringBuilder(text.Length);
        foreach (var ch in text)
        {
            sb.Append(ch switch
            {
                'ي' or 'ى' => 'ی',
                'ك' => 'ک',
                'ة' => 'ه',
                '۰' or '٠' => '0',
                '۱' or '١' => '1',
                '۲' or '٢' => '2',
                '۳' or '٣' => '3',
                '۴' or '٤' => '4',
                '۵' or '٥' => '5',
                '۶' or '٦' => '6',
                '۷' or '٧' => '7',
                '۸' or '٨' => '8',
                '۹' or '٩' => '9',
                _ => ch
            });
        }
        return sb.ToString();
    }
}
