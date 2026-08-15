using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Terma.Application.Common.Authorization;

namespace Terma.Infrastructure.Identity;

public sealed class ApplicationUserClaimsPrincipalFactory(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager,
    IOptions<IdentityOptions> optionsAccessor)
    : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole<Guid>>(userManager, roleManager, optionsAccessor)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(CustomerAuthorization.AccountTypeClaim, user.AccountType.ToString()));
        if (!string.IsNullOrWhiteSpace(user.PhoneNumber))
            identity.AddClaim(new Claim(ClaimTypes.MobilePhone, user.PhoneNumber));
        return identity;
    }
}
