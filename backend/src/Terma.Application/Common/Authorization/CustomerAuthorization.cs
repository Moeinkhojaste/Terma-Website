namespace Terma.Application.Common.Authorization;

public static class CustomerAuthorization
{
    public const string Role = "Customer";
    public const string Policy = "CustomerOnly";
    public const string AuthenticationScheme = "Terma.Customer";
    public const string AccountTypeClaim = "terma:account_type";
    public const string AccountType = "Customer";
}
