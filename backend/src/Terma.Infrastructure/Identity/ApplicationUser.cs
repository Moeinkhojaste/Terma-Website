using Microsoft.AspNetCore.Identity;

namespace Terma.Infrastructure.Identity;

public enum ApplicationUserType { Admin, Customer }

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public ApplicationUserType AccountType { get; set; } = ApplicationUserType.Admin;
}
