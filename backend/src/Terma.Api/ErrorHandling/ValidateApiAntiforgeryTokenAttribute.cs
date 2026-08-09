using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Terma.Api.ErrorHandling;

[AttributeUsage(AttributeTargets.Method)]
public sealed class ValidateApiAntiforgeryTokenAttribute : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var antiforgery = context.HttpContext.RequestServices.GetRequiredService<IAntiforgery>();
        try
        {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        }
        catch (AntiforgeryValidationException)
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Invalid antiforgery token",
                Detail = "A valid antiforgery token is required for this request.",
                Type = "https://httpstatuses.com/400",
                Instance = context.HttpContext.Request.Path,
                Extensions = { ["traceId"] = context.HttpContext.TraceIdentifier }
            })
            {
                StatusCode = StatusCodes.Status400BadRequest
            };
        }
    }
}
