namespace Terma.Infrastructure.Sms;

public sealed class SmsIrOptions
{
    public const string SectionName = "SmsIr";

    public string? ApiKey { get; set; }
    public int TemplateId { get; set; }
    public string ParameterName { get; set; } = "Code";
    public bool Enabled { get; set; } = true;

    public bool IsConfigured => Enabled && !string.IsNullOrWhiteSpace(ApiKey) && TemplateId > 0;
}
