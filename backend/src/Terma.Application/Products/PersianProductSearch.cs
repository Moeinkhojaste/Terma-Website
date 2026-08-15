using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace Terma.Application.Products;

public sealed record ParsedProductSearch(
    IReadOnlyList<string> Terms,
    int? TableCapacity,
    decimal? MinimumPrice,
    decimal? MaximumPrice);

public static partial class PersianProductSearch
{
    private static readonly IReadOnlyDictionary<string, decimal> NumberWords = new Dictionary<string, decimal>
    {
        ["صفر"] = 0, ["یک"] = 1, ["یه"] = 1, ["دو"] = 2, ["سه"] = 3,
        ["چهار"] = 4, ["پنج"] = 5, ["شش"] = 6, ["هفت"] = 7, ["هشت"] = 8,
        ["نه"] = 9, ["ده"] = 10, ["یازده"] = 11, ["دوازده"] = 12
    };

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "زیر", "کمتر", "بیشتر", "بالای", "حداکثر", "حداقل", "از", "تا", "نفر", "نفره",
        "میلیون", "هزار", "تومان", "ریال", "قیمت", "با", "برای"
    };

    public static ParsedProductSearch Parse(string? value)
    {
        var normalized = Normalize(value);
        if (normalized.Length == 0) return new([], null, null, null);

        int? capacity = null;
        var capacityMatch = CapacityRegex().Match(normalized);
        if (capacityMatch.Success && int.TryParse(capacityMatch.Groups["number"].Value, out var parsedCapacity))
            capacity = parsedCapacity;

        decimal? minimum = null;
        decimal? maximum = null;
        foreach (Match match in PriceRegex().Matches(normalized))
        {
            var amount = ParseAmount(match.Groups["amount"].Value, match.Groups["unit"].Value);
            if (!amount.HasValue) continue;
            var direction = match.Groups["direction"].Value;
            if (direction is "زیر" or "کمتر" or "حداکثر") maximum = amount;
            if (direction is "بالای" or "بیشتر" or "حداقل") minimum = amount;
        }

        var terms = TokenRegex().Matches(normalized)
            .Select(match => match.Value)
            .Where(token => token.Length > 1 && !StopWords.Contains(token) && !decimal.TryParse(token, out _) && !NumberWords.ContainsKey(token))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new(terms, capacity, minimum, maximum);
    }

    public static string Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var source = value.Trim().Replace('ي', 'ی').Replace('ى', 'ی').Replace('ك', 'ک').Replace('\u200c', ' ');
        var builder = new StringBuilder(source.Length);
        foreach (var character in source)
        {
            if (character is >= '\u064B' and <= '\u0652' or '\u0670') continue;
            builder.Append(character switch
            {
                >= '\u06F0' and <= '\u06F9' => (char)('0' + character - '\u06F0'),
                >= '\u0660' and <= '\u0669' => (char)('0' + character - '\u0660'),
                _ => character
            });
        }
        return WhitespaceRegex().Replace(builder.ToString(), " ").Trim();
    }

    private static decimal? ParseAmount(string rawAmount, string unit)
    {
        decimal amount;
        if (!decimal.TryParse(rawAmount, NumberStyles.Number, CultureInfo.InvariantCulture, out amount)
            && !NumberWords.TryGetValue(rawAmount, out amount)) return null;
        return unit switch { "میلیون" => amount * 1_000_000m, "هزار" => amount * 1_000m, _ => amount };
    }

    [GeneratedRegex(@"(?<number>\d{1,2})\s*(?:نفره|نفر)", RegexOptions.IgnoreCase)]
    private static partial Regex CapacityRegex();

    [GeneratedRegex(@"(?<direction>زیر|کمتر(?:\s+از)?|بالای|بیشتر(?:\s+از)?|حداکثر|حداقل)\s+(?<amount>\d+(?:[\.,]\d+)?|صفر|یک|یه|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|یازده|دوازده)\s*(?<unit>میلیون|هزار)?", RegexOptions.IgnoreCase)]
    private static partial Regex PriceRegex();

    [GeneratedRegex(@"[\p{L}\p{N}_-]+", RegexOptions.IgnoreCase)]
    private static partial Regex TokenRegex();

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();
}
