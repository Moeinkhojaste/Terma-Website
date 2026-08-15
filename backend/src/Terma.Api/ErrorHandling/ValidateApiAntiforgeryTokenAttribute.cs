using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Terma.Application.Common.Authorization;

namespace Terma.Api.ErrorHandling;

[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class ValidateApiAntiforgeryTokenAttribute : Attribute, IAsyncAuthorizationFilter
{
    public bool RequireAuthenticatedOnly { get; set; }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        if (!(context.HttpContext.User.Identity?.IsAuthenticated ?? false))
        {
            var customerAuth = await context.HttpContext.AuthenticateAsync(CustomerAuthorization.AuthenticationScheme);
            if (customerAuth.Succeeded && customerAuth.Principal is not null)
            {
                context.HttpContext.User = customerAuth.Principal;
            }
        }

        var isAuthenticated = context.HttpContext.User.Identity?.IsAuthenticated ?? false;

        if (RequireAuthenticatedOnly && !isAuthenticated)
        {
            return;
        }

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
