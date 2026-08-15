namespace Terma.Infrastructure.Identity;

public sealed class OtpOptions
{
    public const string SectionName = "Otp";
    public bool ExposeDevelopmentCode { get; init; }
    public string HashKey { get; init; } = string.Empty;
}
