using Terma.Domain.Exceptions;

namespace Terma.Domain.Services;

public static class IranianPhoneNumber
{
    public static string Normalize(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new DomainException("A mobile number is required.");

        var digits = new string(value.Trim().Select(ToEnglishDigit).Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0098", StringComparison.Ordinal)) digits = digits[4..];
        else if (digits.StartsWith("98", StringComparison.Ordinal)) digits = digits[2..];
        if (digits.StartsWith('0')) digits = digits[1..];

        if (digits.Length != 10 || !digits.StartsWith('9'))
            throw new DomainException("The mobile number is not a valid Iranian mobile number.");

        return $"98{digits}";
    }

    public static string ToLocalDisplay(string normalized) =>
        normalized.StartsWith("98", StringComparison.Ordinal) && normalized.Length == 12
            ? $"0{normalized[2..]}"
            : normalized;

    private static char ToEnglishDigit(char value) => value switch
    {
        >= '\u06F0' and <= '\u06F9' => (char)('0' + value - '\u06F0'),
        >= '\u0660' and <= '\u0669' => (char)('0' + value - '\u0660'),
        _ => value
    };
}
