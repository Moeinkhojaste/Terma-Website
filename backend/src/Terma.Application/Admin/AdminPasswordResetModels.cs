using System.ComponentModel.DataAnnotations;
using FluentValidation;

namespace Terma.Application.Admin;

public sealed record AdminPasswordResetRequest(
    [Required, EmailAddress, StringLength(256)] string Email);

public sealed record AdminPasswordResetResponse(
    Guid ChallengeId,
    DateTimeOffset ExpiresAtUtc,
    int ResendDelaySeconds,
    string? DevelopmentCode = null);

public sealed record AdminPasswordResetConfirmRequest(
    Guid ChallengeId,
    [Required, StringLength(6, MinimumLength = 6)] string Code,
    [Required, StringLength(128, MinimumLength = 12)] string NewPassword,
    [Required, StringLength(128, MinimumLength = 12)] string ConfirmPassword);

public enum AdminPasswordResetFailure
{
    NotFound,
    Expired,
    Consumed,
    Invalid,
    AttemptsExceeded,
    UserNotFound,
    PasswordValidationFailed
}

public sealed record AdminPasswordResetResult(
    bool Succeeded,
    string? ErrorMessage = null,
    AdminPasswordResetFailure? FailureReason = null);

public sealed class AdminPasswordResetRequestValidator : AbstractValidator<AdminPasswordResetRequest>
{
    public AdminPasswordResetRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("ایمیل الزامی است.")
            .EmailAddress().WithMessage("فرمت ایمیل نامعتبر است.")
            .MaximumLength(256).WithMessage("طول ایمیل بیش از حد مجاز است.");
    }
}

public sealed class AdminPasswordResetConfirmRequestValidator : AbstractValidator<AdminPasswordResetConfirmRequest>
{
    public AdminPasswordResetConfirmRequestValidator()
    {
        RuleFor(x => x.ChallengeId)
            .NotEmpty().WithMessage("شناسه درخواست تغییر رمز الزامی است.");

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("کد تأیید الزامی است.")
            .Length(6).WithMessage("کد تأیید باید دقیقاً ۶ رقم باشد.")
            .Matches(@"^\d{6}$").WithMessage("کد تأیید فقط شامل اعداد است.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("رمز عبور جدید الزامی است.")
            .MinimumLength(12).WithMessage("رمز عبور باید حداقل ۱۲ کاراکتر باشد.")
            .MaximumLength(128).WithMessage("طول رمز عبور نمی‌تواند بیش از ۱۲۸ کاراکتر باشد.");

        RuleFor(x => x.ConfirmPassword)
            .Equal(x => x.NewPassword).WithMessage("تکرار رمز عبور با رمز عبور جدید یکسان نیست.");
    }
}