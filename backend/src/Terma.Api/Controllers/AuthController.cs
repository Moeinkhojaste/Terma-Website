using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Infrastructure.Identity;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    IAntiforgery antiforgery,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ISecurityAuditService auditService,
    TimeProvider timeProvider) : ControllerBase
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromMinutes(30);

    [AllowAnonymous]
    [HttpGet("antiforgery")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType<AntiforgeryTokenResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AntiforgeryTokenResponse>> GetAntiforgeryToken()
    {
        var customerAuth = await HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        if (customerAuth.Succeeded && customerAuth.Principal is not null)
        {
            HttpContext.User = customerAuth.Principal;
        }
        else if (!(User.Identity?.IsAuthenticated ?? false))
        {
            var adminAuth = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
            if (adminAuth.Succeeded && adminAuth.Principal is not null)
            {
                HttpContext.User = adminAuth.Principal;
            }
        }
        var tokens = antiforgery.GetAndStoreTokens(HttpContext);
        return Ok(new AntiforgeryTokenResponse(tokens.RequestToken!));
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    [ValidateApiAntiforgeryToken]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status423Locked)]
    public async Task<ActionResult<AdminSessionResponse>> Login(LoginRequest request)
    {
        var remoteIp = GetClientIp();
        var user = await userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null)
        {
            await auditService.LogAsync(request.Email.Trim(), "AdminLogin", "AdminSession", "Failure: Invalid credentials", HttpContext.TraceIdentifier, remoteIp);
            return InvalidCredentials();
        }

        var result = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
        {
            await auditService.LogAsync(user.Email!, "AdminLogin", "AdminSession", "Failure: Account locked out", HttpContext.TraceIdentifier, remoteIp);
            return Problem(
                statusCode: StatusCodes.Status423Locked,
                title: "Account temporarily locked",
                detail: "Too many unsuccessful login attempts. Try again in 15 minutes.");
        }

        if (!result.Succeeded)
        {
            await auditService.LogAsync(user.Email!, "AdminLogin", "AdminSession", "Failure: Invalid credentials", HttpContext.TraceIdentifier, remoteIp);
            return InvalidCredentials();
        }

        var expiresAt = timeProvider.GetUtcNow().Add(SessionLifetime);
        await signInManager.SignInAsync(user, new AuthenticationProperties
        {
            AllowRefresh = false,
            ExpiresUtc = expiresAt,
            IsPersistent = false
        });

        await auditService.LogAsync(user.Email!, "AdminLogin", "AdminSession", "Success", HttpContext.TraceIdentifier, remoteIp);
        return Ok(await CreateSessionResponseAsync(user, expiresAt));
    }

    [Authorize(Policy = AdminAuthorization.Policy)]
    [HttpGet("me")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
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
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        var userEmail = User.Identity?.Name ?? "admin";
        await signInManager.SignOutAsync();
        await auditService.LogAsync(userEmail, "AdminLogout", "AdminSession", "Success", HttpContext.TraceIdentifier, GetClientIp());
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

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(128, MinimumLength = 1)] string Password);

public sealed record AdminSessionResponse(string Email, string? Role, DateTimeOffset ExpiresAtUtc);

public sealed record AntiforgeryTokenResponse(string Token);
