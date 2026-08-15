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
[Route("api/customer")]
[Authorize(Policy = CustomerAuthorization.Policy)]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class CustomerProfileController(
    ICustomerAccountService accounts,
    UserManager<ApplicationUser> userManager,
    IUserClaimsPrincipalFactory<ApplicationUser> claimsFactory,
    ISecurityAuditService auditService,
    TimeProvider timeProvider) : ControllerBase
{
    private static readonly TimeSpan SessionLifetime = TimeSpan.FromDays(30);

    [HttpGet("dashboard")]
    public Task<CustomerDashboardDto> Dashboard(CancellationToken cancellationToken) =>
        accounts.GetDashboardAsync(CurrentUserId(), cancellationToken);

    [HttpGet("profile")]
    public Task<CustomerProfileDto> Profile(CancellationToken cancellationToken) =>
        accounts.GetProfileAsync(CurrentUserId(), cancellationToken);

    [HttpPut("profile")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await accounts.UpdateProfileAsync(CurrentUserId(), request, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "UpdateProfile", request.FullName, "Success", HttpContext.TraceIdentifier, GetClientIp(), cancellationToken);
        return Ok(result);
    }

    [HttpPost("profile/phone/request-otp")]
    [EnableRateLimiting("otp-request")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<RequestOtpResponse>> RequestPhoneChangeOtp([FromBody] RequestPhoneChangeRequest request, CancellationToken cancellationToken)
    {
        var ip = GetClientIp();
        var response = await accounts.RequestPhoneChangeOtpAsync(CurrentUserId(), request.NewPhone, ip, cancellationToken);
        await auditService.LogAsync(CurrentUserId().ToString(), "PhoneChangeOtpRequest", request.NewPhone, "Success", HttpContext.TraceIdentifier, ip, cancellationToken);
        return Ok(response);
    }

    [HttpPost("profile/phone/verify-otp")]
    [EnableRateLimiting("otp-verify")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CustomerSessionDto>> VerifyPhoneChangeOtp([FromBody] VerifyPhoneChangeRequest request, CancellationToken cancellationToken)
    {
        var ip = GetClientIp();
        var result = await accounts.VerifyPhoneChangeOtpAsync(CurrentUserId(), request.ChallengeId, request.Code, request.NewPhone, cancellationToken);
        if (result.Failure != VerifyOtpFailure.None || !result.UserId.HasValue)
        {
            await auditService.LogAsync(CurrentUserId().ToString(), "PhoneChangeOtpVerify", request.ChallengeId.ToString(), $"Failure: {result.Failure}", HttpContext.TraceIdentifier, ip, cancellationToken);
            return VerificationProblem(result.Failure);
        }

        var user = await userManager.FindByIdAsync(result.UserId.Value.ToString());
        if (user is null) return NotFound();

        var principal = await claimsFactory.CreateAsync(user);
        var expiresAt = timeProvider.GetUtcNow().Add(SessionLifetime);
        await HttpContext.SignInAsync(CustomerAuthorization.AuthenticationScheme, principal, new AuthenticationProperties
        {
            AllowRefresh = false,
            ExpiresUtc = expiresAt,
            IsPersistent = true
        });

        await auditService.LogAsync(user.PhoneNumber ?? user.Id.ToString(), "PhoneChangeOtpVerify", "PhoneUpdated", "Success", HttpContext.TraceIdentifier, ip, cancellationToken);
        return Ok(new CustomerSessionDto(user.Id, result.Phone!, expiresAt, result.ClaimedOrderCount));
    }

    private ObjectResult VerificationProblem(VerifyOtpFailure failure) => failure switch
    {
        VerifyOtpFailure.Expired => Problem(statusCode: StatusCodes.Status410Gone, title: "Verification code expired", detail: "Request a new verification code."),
        VerifyOtpFailure.AttemptsExceeded => Problem(statusCode: StatusCodes.Status429TooManyRequests, title: "Too many attempts", detail: "Request a new verification code."),
        VerifyOtpFailure.Consumed => Problem(statusCode: StatusCodes.Status409Conflict, title: "Verification code already used", detail: "Request a new verification code."),
        VerifyOtpFailure.NotFound => Problem(statusCode: StatusCodes.Status404NotFound, title: "Verification request not found", detail: "Request a new verification code."),
        _ => Problem(statusCode: StatusCodes.Status400BadRequest, title: "Invalid verification code", detail: "The verification code is incorrect.")
    };

    private Guid CurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}
