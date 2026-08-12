using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Customers;
using Terma.Infrastructure.Identity;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer-auth")]
public sealed class CustomerAuthController(
    ICustomerAccountService accounts,
    UserManager<ApplicationUser> userManager,
    IUserClaimsPrincipalFactory<ApplicationUser> claimsFactory,
    TimeProvider timeProvider) : ControllerBase
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(30);

    [AllowAnonymous]
    [HttpPost("otp/request")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<RequestOtpResponse>> RequestOtp(RequestOtpRequest request, CancellationToken cancellationToken)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return Ok(await accounts.RequestOtpAsync(request.Phone, ip, cancellationToken));
    }

    [AllowAnonymous]
    [HttpPost("otp/verify")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerSessionDto>> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await accounts.VerifyOtpAsync(request.ChallengeId, request.Code, cancellationToken);
        if (result.Failure != VerifyOtpFailure.None || !result.UserId.HasValue)
            return VerificationProblem(result.Failure);

        var user = await userManager.FindByIdAsync(result.UserId.Value.ToString());
        if (user is null || user.AccountType != ApplicationUserType.Customer)
            return VerificationProblem(VerifyOtpFailure.NotFound);

        var principal = await claimsFactory.CreateAsync(user);
        var expiresAt = timeProvider.GetUtcNow().Add(SessionLifetime);
        await HttpContext.SignInAsync(CustomerAuthorization.AuthenticationScheme, principal, new AuthenticationProperties
        {
            AllowRefresh = false,
            ExpiresUtc = expiresAt,
            IsPersistent = true
        });
        // Antiforgery tokens include the current identity. The token issued
        // before OTP verification belongs to the anonymous principal, so
        // expire its cookie and let the next mutation fetch a customer-bound
        // token pair.
        Response.Cookies.Delete("Terma.Antiforgery.Dev");
        Response.Cookies.Delete("__Host-Terma.Antiforgery");
        return Ok(new CustomerSessionDto(user.Id, result.Phone!, expiresAt, result.ClaimedOrderCount));
    }

    [Authorize(Policy = CustomerAuthorization.Policy)]
    [HttpGet("me")]
    public async Task<ActionResult<CustomerSessionDto>> Me()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var auth = await HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        var phone = User.FindFirstValue(ClaimTypes.MobilePhone) ?? string.Empty;
        return Ok(new CustomerSessionDto(userId, ToLocalPhone(phone), auth.Properties?.ExpiresUtc ?? timeProvider.GetUtcNow()));
    }

    [Authorize(Policy = CustomerAuthorization.Policy)]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        // Logout only invalidates this user's authentication cookie. It does
        // not change server-side business data, so it is intentionally safe
        // to call even when an anonymous/stale antiforgery token is present.
        await HttpContext.SignOutAsync(CustomerAuthorization.AuthenticationScheme);
        return NoContent();
    }

    private ObjectResult VerificationProblem(VerifyOtpFailure failure) => failure switch
    {
        VerifyOtpFailure.Expired => Problem(statusCode: StatusCodes.Status410Gone, title: "Verification code expired", detail: "Request a new verification code."),
        VerifyOtpFailure.AttemptsExceeded => Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "Too many attempts", detail: "Request a new verification code."),
        VerifyOtpFailure.Consumed => Problem(statusCode: StatusCodes.Status409Conflict, title: "Verification code already used", detail: "Request a new verification code."),
        VerifyOtpFailure.NotFound => Problem(statusCode: StatusCodes.Status404NotFound, title: "Verification request not found", detail: "Request a new verification code."),
        _ => Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid verification code", detail: "The verification code is incorrect.")
    };

    private bool TryGetUserId(out Guid userId) => Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out userId);
    private static string ToLocalPhone(string normalized) => normalized.StartsWith("98", StringComparison.Ordinal) ? $"0{normalized[2..]}" : normalized;
}
