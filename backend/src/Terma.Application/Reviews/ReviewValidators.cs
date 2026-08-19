using FluentValidation;

namespace Terma.Application.Reviews;

public sealed class CreateReviewRequestValidator : AbstractValidator<CreateReviewRequest>
{
    public CreateReviewRequestValidator()
    {
        RuleFor(request => request.ProductId)
            .NotEmpty().WithMessage("شناسه محصول الزامی است.");

        RuleFor(request => request.Rating)
            .InclusiveBetween(1, 5).WithMessage("امتیاز باید بین ۱ تا ۵ ستاره باشد.");

        RuleFor(request => request.Title)
            .MaximumLength(150).WithMessage("عنوان نظر نمی‌تواند بیش از ۱۵۰ کاراکتر باشد.");

        RuleFor(request => request.Comment)
            .NotEmpty().WithMessage("متن نظر الزامی است.")
            .MinimumLength(3).WithMessage("متن نظر باید حداقل ۳ کاراکتر باشد.")
            .MaximumLength(1000).WithMessage("متن نظر نمی‌تواند بیش از ۱۰۰۰ کاراکتر باشد.");
    }
}

public sealed class AdminReplyReviewRequestValidator : AbstractValidator<AdminReplyReviewRequest>
{
    public AdminReplyReviewRequestValidator()
    {
        RuleFor(request => request.Response)
            .NotEmpty().WithMessage("متن پاسخ ادمین الزامی است.")
            .MaximumLength(1000).WithMessage("پاسخ ادمین نمی‌تواند بیش از ۱۰۰۰ کاراکتر باشد.");
    }
}
