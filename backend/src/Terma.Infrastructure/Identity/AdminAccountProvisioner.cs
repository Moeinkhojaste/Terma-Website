using Microsoft.AspNetCore.Identity;
using Terma.Application.Common.Authorization;

namespace Terma.Infrastructure.Identity;

public sealed class AdminAccountProvisioner(
    UserManager<AdminUser> userManager,
    RoleManager<IdentityRole<Guid>> roleManager)
{
    public async Task ProvisionAsync(string email, string password)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new InvalidOperationException("AdminSeed:Email is required.");

        if (string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("AdminSeed:Password is required.");

        if (!await roleManager.RoleExistsAsync(AdminAuthorization.Role))
        {
            var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(AdminAuthorization.Role));
            EnsureSucceeded(roleResult, "Could not create the Admin role.");
        }

        var normalizedEmail = email.Trim();
        var user = await userManager.FindByEmailAsync(normalizedEmail);
        if (user is null)
        {
            user = new AdminUser
            {
                UserName = normalizedEmail,
                Email = normalizedEmail,
                EmailConfirmed = true
            };

            EnsureSucceeded(await userManager.CreateAsync(user, password), "Could not create the admin account.");
        }
        else
        {
            var resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
            EnsureSucceeded(
                await userManager.ResetPasswordAsync(user, resetToken, password),
                "Could not update the admin password.");
        }

        if (!await userManager.IsInRoleAsync(user, AdminAuthorization.Role))
            EnsureSucceeded(
                await userManager.AddToRoleAsync(user, AdminAuthorization.Role),
                "Could not assign the Admin role.");
    }

    private static void EnsureSucceeded(IdentityResult result, string message)
    {
        if (result.Succeeded)
            return;

        var errors = string.Join(" ", result.Errors.Select(error => error.Description));
        throw new InvalidOperationException($"{message} {errors}");
    }
}
