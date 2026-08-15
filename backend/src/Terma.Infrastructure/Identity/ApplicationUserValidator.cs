using Microsoft.AspNetCore.Identity;

namespace Terma.Infrastructure.Identity;

public sealed class ApplicationUserValidator : UserValidator<ApplicationUser>
{
    private readonly IdentityErrorDescriber _errors;

    public ApplicationUserValidator(IdentityErrorDescriber errors) : base(errors) => _errors = errors;

    public override async Task<IdentityResult> ValidateAsync(UserManager<ApplicationUser> manager, ApplicationUser user)
    {
        if (user.AccountType == ApplicationUserType.Admin)
            return await base.ValidateAsync(manager, user);

        var validationErrors = new List<IdentityError>();
        if (string.IsNullOrWhiteSpace(user.UserName))
            validationErrors.Add(_errors.InvalidUserName(user.UserName ?? string.Empty));
        else
        {
            var owner = await manager.FindByNameAsync(user.UserName);
            if (owner is not null && owner.Id != user.Id)
                validationErrors.Add(_errors.DuplicateUserName(user.UserName));
        }
        if (string.IsNullOrWhiteSpace(user.PhoneNumber) || !user.PhoneNumberConfirmed)
            validationErrors.Add(new IdentityError { Code = "VerifiedPhoneRequired", Description = "A verified mobile number is required." });
        return validationErrors.Count == 0 ? IdentityResult.Success : IdentityResult.Failed(validationErrors.ToArray());
    }
}
