using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Infrastructure.Identity;
using Terma.Application.Common.Authorization;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAntiforgery antiforgery,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    TimeProvider timeProvider) : ControllerBase
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(30);

    [AllowAnonymous]
    [HttpGet("antiforgery")]
    [ProducesResponseType<AntiforgeryTokenResponse>(StatusCodes.Status200OK)]
    public ActionResult<AntiforgeryTokenResponse> GetAntiforgeryToken()
    {
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new AntiforgeryTokenResponse(tokens.RequestToken!));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("public-write")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    public async Task<ActionResult<AdminSessionResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
            return InvalidCredentials();
        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
        {
            return Problem(
                statusCode: StatusCodes.Status423Locked,
                title: "Account temporarily locked",
                detail: "Too many unsuccessful login attempts. Try again later.");
        }

        if (!result.Succeeded)
            return InvalidCredentials();

        var expiresAt = timeProvider.GetUtcNow().Add(SessionLifetime);
        await signInManager.SignInAsync(user, new AuthenticationProperties
        {
            AllowRefresh = false,
            ExpiresUtc = expiresAt,
            IsPersistent = false
        });

        return Ok(await CreateSessionResponseAsync(user, expiresAt));
    }

    [Authorize(Policy = AdminAuthorization.Policy)]
    [HttpGet("me")]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<AdminSessionResponse>> Me()
    {
        var user = await userManager.GetUserAsync(User);
        if (user is null)
            return UnauthorizedProblem();

        var authentication = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        var expiresAt = authentication.Properties?.ExpiresUtc ?? timeProvider.GetUtcNow();
        return Ok(await CreateSessionResponseAsync(user, expiresAt));
    }

    [Authorize(Policy = AdminAuthorization.Policy)]
    [HttpPost("logout")]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        await signInManager.SignOutAsync();
        return NoContent();
    }

    private async Task<AdminSessionResponse> CreateSessionResponseAsync(ApplicationUser user, DateTimeOffset expiresAt)
    {
        var roles = await userManager.GetRolesAsync(user);
        return new AdminSessionResponse(user.Email!, roles.FirstOrDefault(), expiresAt);
    }

    private ObjectResult InvalidCredentials() => Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Login failed",
        detail: "The email or password is incorrect.");

    private ObjectResult UnauthorizedProblem() => Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Authentication required",
        detail: "The session is missing or has expired.");
}

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(256, MinimumLength = 1)] string Password);

public sealed record AdminSessionResponse(string Email, string? Role, DateTimeOffset ExpiresAtUtc);

public sealed record AntiforgeryTokenResponse(string Token);
