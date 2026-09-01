using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Terma.Application.Common.Exceptions;
using Terma.Domain.Exceptions;

namespace Terma.Api.ErrorHandling;

public sealed class ApiExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var problem = CreateProblem(httpContext, exception);
        if (exception is TooManyRequestsException rateLimit)
            httpContext.Response.Headers.RetryAfter = rateLimit.RetryAfterSeconds.ToString();
        if (problem.Status >= 500)
            logger.LogError(exception, "Unhandled exception for {Method} {Path}", httpContext.Request.Method, httpContext.Request.Path);

        httpContext.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }

    private static ProblemDetails CreateProblem(HttpContext context, Exception exception)
    {
        ProblemDetails problem = exception switch
        {
            ValidationException validationException => CreateValidationProblem(validationException),
            NotFoundException => Create(StatusCodes.Status404NotFound, "یافت نشد", exception.Message),
            ConflictException => Create(StatusCodes.Status409Conflict, "تداخل در عملیات", exception.Message),
            PreconditionFailedException => Create(StatusCodes.Status412PreconditionFailed, "اطلاعات به‌روز نیست", string.IsNullOrWhiteSpace(exception.Message) ? "اطلاعات هم‌زمان توسط فرآیند دیگری تغییر یافته است. لطفاً صفحه را تازه‌سازی نمایید." : exception.Message),
            TooManyRequestsException => Create(StatusCodes.Status429TooManyRequests, "تعداد درخواست بیش از حد مجاز", string.IsNullOrWhiteSpace(exception.Message) ? "تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً چند لحظه بعد مجدداً تلاش کنید." : exception.Message),
            DomainException => Create(StatusCodes.Status400BadRequest, "خطای اعتبارسنجی عملیات", exception.Message),
            _ => Create(StatusCodes.Status500InternalServerError, "خطای سرور", "خطایی در پردازش اطلاعات در سرور رخ داده است. لطفاً لحظاتی دیگر دوباره تلاش نمایید.")
        };

        problem.Instance = context.Request.Path;
        problem.Extensions["traceId"] = context.TraceIdentifier;
        return problem;
    }

    private static ProblemDetails Create(int status, string title, string detail) => new()
    {
        Status = status,
        Title = title,
        Detail = detail,
        Type = $"https://httpstatuses.com/{status}"
    };

    private static ValidationProblemDetails CreateValidationProblem(ValidationException exception)
    {
        var errors = exception.Errors
            .GroupBy(error => error.PropertyName)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.ErrorMessage).Distinct().ToArray());

        return new ValidationProblemDetails(errors)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "خطای اعتبارسنجی داده‌ها",
            Detail = "یک یا چند فیلد ورودی به درستی وارد نشده‌اند.",
            Type = "https://httpstatuses.com/400"
        };
    }
}
