using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Admin;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;
using IEmailSender = Terma.Application.Common.Interfaces.IEmailSender;

namespace Terma.Infrastructure.Identity;

public sealed class AdminPasswordResetService : IAdminPasswordResetService
{
    private static readonly TimeSpan CodeLifetime = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan RequestWindow = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ResendDelay = TimeSpan.FromSeconds(60);

    private readonly TermaDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IEmailSender _emailSender;
    private readonly OtpOptions _otpOptions;
    private readonly ISecurityAuditService _auditService;
    private readonly IWebHostEnvironment _environment;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<AdminPasswordResetService> _logger;

    public AdminPasswordResetService(
        TermaDbContext db,
        UserManager<ApplicationUser> userManager,
        IEmailSender emailSender,
        IOptions<OtpOptions> otpOptions,
        ISecurityAuditService auditService,
        IWebHostEnvironment environment,
        TimeProvider timeProvider,
        ILogger<AdminPasswordResetService> logger)
    {
        _db = db;
        _userManager = userManager;
        _emailSender = emailSender;
        _otpOptions = otpOptions.Value;
        _auditService = auditService;
        _environment = environment;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<AdminPasswordResetResponse> RequestPasswordResetAsync(
        string email,
        string remoteIp,
        CancellationToken cancellationToken = default)
    {
        EnsureHashKey();

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var since = now - RequestWindow;
        var ipHash = Hash($"ip:{remoteIp}");

        var user = await _userManager.FindByEmailAsync(normalizedEmail);
        if (user is null || !await _userManager.IsInRoleAsync(user, AdminAuthorization.Role))
        {
            _logger.LogWarning("Admin password reset requested for non-admin email: {Email} from IP: {Ip}", email, remoteIp);
            await _auditService.LogAsync(normalizedEmail, "AdminPasswordResetRequest", "AdminAccount", "Failure: Not an admin account", null, remoteIp, cancellationToken);
            throw new InvalidOperationException("درخواست تغییر رمز عبور تنها برای ایمیل مدیر مجاز است.");
        }

        var latest = await _db.AdminPasswordResetChallenges
            .Where(x => x.AdminEmail == normalizedEmail)
            .OrderByDescending(x => x.RequestedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

        if (latest is not null && latest.RequestedAtUtc + ResendDelay > now)
        {
            var retry = Math.Max(1, (int)Math.Ceiling((latest.RequestedAtUtc + ResendDelay - now).TotalSeconds));
            throw new TooManyRequestsException("لطفاً پیش از درخواست مجدد کد تأیید، کمی صبر کنید.", retry);
        }

        if (await _db.AdminPasswordResetChallenges.CountAsync(x => x.AdminEmail == normalizedEmail && x.RequestedAtUtc >= since, cancellationToken) >= 3)
        {
            throw new TooManyRequestsException("تعداد درخواست‌های کد تأیید برای این حساب بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر تلاش فرمایید.", 600);
        }

        if (await _db.AdminPasswordResetChallenges.CountAsync(x => x.RequestIpHash == ipHash && x.RequestedAtUtc >= since, cancellationToken) >= 5)
        {
            throw new TooManyRequestsException("تعداد درخواست‌ها از این آدرس بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر تلاش فرمایید.", 600);
        }

        var activeChallenges = await _db.AdminPasswordResetChallenges
            .Where(x => x.AdminEmail == normalizedEmail && x.ConsumedAtUtc == null && x.InvalidatedAtUtc == null && x.ExpiresAtUtc > now)
            .ToListAsync(cancellationToken);

        foreach (var active in activeChallenges)
        {
            active.Invalidate(now);
        }

        var code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString("D6");
        var codeHash = Hash($"admin-pwd-reset:{normalizedEmail}:{code}");
        var challenge = new AdminPasswordResetChallenge(normalizedEmail, codeHash, ipHash, now, now + CodeLifetime);

        await _db.AdminPasswordResetChallenges.AddAsync(challenge, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var emailSubject = "کد تأیید تغییر رمز عبور مدیریت فروشگاه ترما";
        var emailBody = BuildEmailTemplate(code);

        try
        {
            await _emailSender.SendEmailAsync(user.Email!, emailSubject, emailBody, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send admin password reset email to {Email}", user.Email);
        }

        await _auditService.LogAsync(user.Email!, "AdminPasswordResetRequest", "AdminAccount", "Success", null, remoteIp, cancellationToken);

        var expose = _environment.IsDevelopment() || _otpOptions.ExposeDevelopmentCode;
        return new AdminPasswordResetResponse(
            challenge.Id,
            new DateTimeOffset(challenge.ExpiresAtUtc, TimeSpan.Zero),
            (int)ResendDelay.TotalSeconds,
            expose ? code : null);
    }

    public async Task<AdminPasswordResetResult> ConfirmPasswordResetAsync(
        AdminPasswordResetConfirmRequest request,
        string remoteIp,
        CancellationToken cancellationToken = default)
    {
        EnsureHashKey();

        var challenge = await _db.AdminPasswordResetChallenges
            .SingleOrDefaultAsync(x => x.Id == request.ChallengeId, cancellationToken);

        if (challenge is null)
        {
            return new AdminPasswordResetResult(false, "درخواست تغییر رمز عبور یافت نشد.", AdminPasswordResetFailure.NotFound);
        }

        var normalizedCode = NormalizeCode(request.Code.Trim());
        var expected = Encoding.UTF8.GetBytes(challenge.CodeHash);
        var actual = Encoding.UTF8.GetBytes(Hash($"admin-pwd-reset:{challenge.AdminEmail}:{normalizedCode}"));
        var matches = expected.Length == actual.Length && CryptographicOperations.FixedTimeEquals(expected, actual);

        var verifyResult = challenge.Verify(matches, _timeProvider.GetUtcNow().UtcDateTime);
        if (verifyResult != AdminPasswordResetVerificationResult.Succeeded)
        {
            await _db.SaveChangesAsync(cancellationToken);
            await _auditService.LogAsync(
                challenge.AdminEmail,
                "AdminPasswordResetConfirm",
                "AdminAccount",
                $"Failure: {verifyResult}",
                null,
                remoteIp,
                cancellationToken);

            return verifyResult switch
            {
                AdminPasswordResetVerificationResult.Expired =>
                    new AdminPasswordResetResult(false, "کد تأیید منقضی شده است. لطفاً مجدداً درخواست کد دهید.", AdminPasswordResetFailure.Expired),
                AdminPasswordResetVerificationResult.Consumed =>
                    new AdminPasswordResetResult(false, "این کد قبلاً استفاده یا باطل شده است.", AdminPasswordResetFailure.Consumed),
                AdminPasswordResetVerificationResult.AttemptsExceeded =>
                    new AdminPasswordResetResult(false, "تعداد دفعات ورود کد اشتباه بیش از حد مجاز است. لطفاً مجدداً درخواست دهید.", AdminPasswordResetFailure.AttemptsExceeded),
                _ =>
                    new AdminPasswordResetResult(false, "کد تأیید وارد شده نامعتبر است.", AdminPasswordResetFailure.Invalid)
            };
        }

        var user = await _userManager.FindByEmailAsync(challenge.AdminEmail);
        if (user is null)
        {
            return new AdminPasswordResetResult(false, "حساب کاربری مدیر یافت نشد.", AdminPasswordResetFailure.UserNotFound);
        }

        foreach (var validator in _userManager.PasswordValidators)
        {
            var validationResult = await validator.ValidateAsync(_userManager, user, request.NewPassword);
            if (!validationResult.Succeeded)
            {
                var errorDescription = string.Join(" ", validationResult.Errors.Select(e => e.Description));
                return new AdminPasswordResetResult(false, errorDescription, AdminPasswordResetFailure.PasswordValidationFailed);
            }
        }

        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var identityResult = await _userManager.ResetPasswordAsync(user, resetToken, request.NewPassword);

        if (!identityResult.Succeeded)
        {
            var errors = string.Join(" ", identityResult.Errors.Select(e => e.Description));
            return new AdminPasswordResetResult(false, errors, AdminPasswordResetFailure.PasswordValidationFailed);
        }

        await _userManager.SetLockoutEndDateAsync(user, null);
        await _userManager.ResetAccessFailedCountAsync(user);

        await _db.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            user.Email!,
            "AdminPasswordResetConfirm",
            "AdminAccount",
            "Success: Password changed",
            null,
            remoteIp,
            cancellationToken);

        _logger.LogInformation("Admin password for {Email} was reset successfully from IP: {Ip}", user.Email, remoteIp);

        return new AdminPasswordResetResult(true);
    }

    private void EnsureHashKey()
    {
        if (string.IsNullOrWhiteSpace(_otpOptions.HashKey) || _otpOptions.HashKey.Length < 32)
            throw new InvalidOperationException("Otp:HashKey must be configured with at least 32 characters.");
        if (!_environment.IsDevelopment() && _otpOptions.HashKey.StartsWith("Terma-development-only", StringComparison.Ordinal))
            throw new InvalidOperationException("A production OTP hash key must be configured outside source control.");
    }

    private string Hash(string value)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_otpOptions.HashKey));
        return Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(value)));
    }

    private static string NormalizeCode(string code) => new(code.Select(value => value switch
    {
        >= '\u06F0' and <= '\u06F9' => (char)('0' + value - '\u06F0'),
        >= '\u0660' and <= '\u0669' => (char)('0' + value - '\u0660'),
        _ => value
    }).ToArray());

    private static string BuildEmailTemplate(string code)
    {
        return @"
<!DOCTYPE html>
<html lang=""fa"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <title>کد تأیید تغییر رمز عبور</title>
</head>
<body style=""margin:0;padding:24px;background-color:#f7f5f0;font-family:Vazirmatn,Tahoma,Arial,sans-serif;color:#1e293b;direction:rtl;"">
    <div style=""max-width:540px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);border:1px solid #e2e8f0;"">
        <div style=""background:#0d4b3b;padding:24px;text-align:center;color:#ffffff;"">
            <h1 style=""margin:0;font-size:22px;font-weight:700;"">فروشگاه صنایع دستی ترما</h1>
            <p style=""margin:6px 0 0;font-size:14px;color:#d1fae5;"">مدیریت فروشگاه</p>
        </div>
        <div style=""padding:32px 24px;text-align:right;"">
            <h2 style=""margin:0 0 16px;font-size:18px;color:#0f172a;"">درخواست تغییر رمز عبور پنل مدیریت</h2>
            <p style=""margin:0 0 16px;font-size:14px;line-height:1.8;color:#475569;"">
                یک درخواست برای تغییر رمز عبور حساب مدیریت در سایت ثبت گردیده است. برای ثبت رمز عبور جدید، لطفاً کد تأیید زیر را در صفحه مدیریت وارد نمایید:
            </p>
            <div style=""text-align:center;margin:28px 0;"">
                <div style=""display:inline-block;padding:14px 32px;background:#f0fdf4;border:2px dashed #10b981;border-radius:8px;font-size:32px;font-weight:bold;letter-spacing:10px;color:#065f46;direction:ltr;"">
                    " + code + @"
                </div>
            </div>
            <p style=""margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.7;"">
                ⏱ این کد به مدت <strong>۱۰ دقیقه</strong> معتبر است.
            </p>
            <p style=""margin:0;font-size:13px;color:#dc2626;line-height:1.7;"">
                ⚠️ اگر شما این درخواست را ارسال نکرده‌اید، این ایمیل را نادیده بگیرید. رمز عبور حساب شما بدون ورود این کد تغییر نخواهد کرد.
            </p>
        </div>
        <div style=""background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;"">
            termabrand.ir | فروشگاه اینترنتی سفره‌های ترمه اصیل ایرانی
        </div>
    </div>
</body>
</html>";
    }
}