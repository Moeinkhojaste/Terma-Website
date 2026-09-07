using Microsoft.AspNetCore.Identity;
using Terma.Application.Common.Authorization;

namespace Terma.Infrastructure.Identity;

public sealed class AdminAccountProvisioner(
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager)
{
    public async Task ProvisionAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
            throw new InvalidOperationException("A valid administrator email address is required.");

        if (string.IsNullOrWhiteSpace(password) || password.Length < 12 || password.Length > 128)
            throw new InvalidOperationException("Administrator password must be between 12 and 128 characters long.");

        if (!await roleManager.RoleExistsAsync(AdminAuthorization.Role))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(AdminAuthorization.Role));
            EnsureSucceeded(roleResult, "Could not create the Admin role.");
        }

        var normalizedEmail = email.Trim();
        var user = await userManager.FindByEmailAsync(normalizedEmail);
        if (user is not null)
        {
            throw new InvalidOperationException($"An administrator account for '{normalizedEmail}' already exists. Refusing to overwrite existing account.");
        }

        user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            EmailConfirmed = true,
            AccountType = ApplicationUserType.Admin
        };

        EnsureSucceeded(await userManager.CreateAsync(user, password), "Could not create the admin account.");
        EnsureSucceeded(await userManager.AddToRoleAsync(user, AdminAuthorization.Role), "Could not assign the Admin role.");
    }

    public async Task EnsureAdminAccountExistsAsync(string email, string fallbackPassword)
    {
        var normalizedEmail = email.Trim();
        if (!await roleManager.RoleExistsAsync(AdminAuthorization.Role))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(AdminAuthorization.Role));
            EnsureSucceeded(roleResult, "Could not create the Admin role.");
        }

        var targetUser = await userManager.FindByEmailAsync(normalizedEmail);
        if (targetUser is null)
        {
            var oldAdmin = await userManager.FindByEmailAsync("admin@terma.local");
            if (oldAdmin is not null)
            {
                oldAdmin.UserName = normalizedEmail;
                oldAdmin.Email = normalizedEmail;
                oldAdmin.EmailConfirmed = true;
                EnsureSucceeded(await userManager.UpdateAsync(oldAdmin), "Could not migrate existing admin account email.");
                return;
            }

            var user = new ApplicationUser
            {
                UserName = normalizedEmail,
                Email = normalizedEmail,
                EmailConfirmed = true,
                AccountType = ApplicationUserType.Admin
            };

            EnsureSucceeded(await userManager.CreateAsync(user, fallbackPassword), "Could not create the admin account.");
            EnsureSucceeded(await userManager.AddToRoleAsync(user, AdminAuthorization.Role), "Could not assign the Admin role.");
        }
    }

    private static void EnsureSucceeded(IdentityResult result, string message)
    {
        if (result.Succeeded)
            return;

        var errors = string.Join(" ", result.Errors.Select(error => error.Description));
        throw new InvalidOperationException($"{message} {errors}");
    }
}
