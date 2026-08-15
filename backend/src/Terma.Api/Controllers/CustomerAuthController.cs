using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Customers;
using Terma.Infrastructure.Identity;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer-auth")]
public sealed class CustomerAuthController(
    ICustomerAccountService accounts,
    UserManager<ApplicationUser> userManager,
    IUserClaimsPrincipalFactory<ApplicationUser> claimsFactory,
    ISecurityAuditService auditService,
    TimeProvider timeProvider) : ControllerBase
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(30);

    [AllowAnonymous]
    [HttpPost("otp/request")]
    [EnableRateLimiting("otp-request")]
    [ValidateApiAntiforgeryToken]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<RequestOtpResponse>> RequestOtp(RequestOtpRequest request, CancellationToken cancellationToken)
    {
        var ip = GetClientIp();
        var response = await accounts.RequestOtpAsync(request.Phone, ip, cancellationToken);
        await auditService.LogAsync("Anonymous", "OtpRequest", request.Phone, "Success", HttpContext.TraceIdentifier, ip, cancellationToken);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("otp/verify")]
    [EnableRateLimiting("otp-verify")]
    [ValidateApiAntiforgeryToken]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<CustomerSessionDto>> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var ip = GetClientIp();
        var result = await accounts.VerifyOtpAsync(request.ChallengeId, request.Code, cancellationToken);
        if (result.Failure != VerifyOtpFailure.None || !result.UserId.HasValue)
        {
            await auditService.LogAsync("Anonymous", "OtpVerify", request.ChallengeId.ToString(), $"Failure: {result.Failure}", HttpContext.TraceIdentifier, ip, cancellationToken);
            return VerificationProblem(result.Failure);
        }

        var user = await userManager.FindByIdAsync(result.UserId.Value.ToString());
        if (user is null || user.AccountType != ApplicationUserType.Customer)
        {
            await auditService.LogAsync("Anonymous", "OtpVerify", request.ChallengeId.ToString(), "Failure: User not found", HttpContext.TraceIdentifier, ip, cancellationToken);
            return VerificationProblem(VerifyOtpFailure.NotFound);
        }

        var principal = await claimsFactory.CreateAsync(user);
        var expiresAt = timeProvider.GetUtcNow().Add(SessionLifetime);
        await HttpContext.SignInAsync(CustomerAuthorization.AuthenticationScheme, principal, new AuthenticationProperties
        {
            AllowRefresh = false,
            ExpiresUtc = expiresAt,
            IsPersistent = true
        });

        await auditService.LogAsync(user.PhoneNumber ?? user.Id.ToString(), "OtpVerify", "CustomerSession", "Success", HttpContext.TraceIdentifier, ip, cancellationToken);
        return Ok(new CustomerSessionDto(user.Id, result.Phone!, expiresAt, result.ClaimedOrderCount));
    }

    [Authorize(Policy = CustomerAuthorization.Policy)]
    [HttpGet("me")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<CustomerSessionDto>> Me()
    {
        if (!TryGetUserId(out var userId)) return Unauthorized();
        var auth = await HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
        var phone = User.FindFirstValue(ClaimTypes.MobilePhone) ?? string.Empty;
        return Ok(new CustomerSessionDto(userId, ToLocalPhone(phone), auth.Properties?.ExpiresUtc ?? timeProvider.GetUtcNow()));
    }

    [Authorize(Policy = CustomerAuthorization.Policy)]
    [HttpPost("logout")]
    [ValidateApiAntiforgeryToken]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<IActionResult> Logout()
    {
        var phone = User.FindFirstValue(ClaimTypes.MobilePhone) ?? "Customer";
        await HttpContext.SignOutAsync(CustomerAuthorization.AuthenticationScheme);
        await auditService.LogAsync(phone, "CustomerLogout", "CustomerSession", "Success", HttpContext.TraceIdentifier, GetClientIp());
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

    private string GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
