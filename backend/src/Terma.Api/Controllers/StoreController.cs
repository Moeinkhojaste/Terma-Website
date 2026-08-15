using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Interfaces;
using Terma.Application.Products;
using Terma.Application.Store;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/store")]
public sealed class StoreController(
    IStoreOperationsService service,
    IProductService productService,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("content")]
    public Task<IReadOnlyList<StoreContentDto>> Content([FromQuery] string? page, CancellationToken ct) =>
        service.ContentAsync(page, false, ct);

    [HttpPost("messages")]
    [EnableRateLimiting("contact-message")]
    [ValidateApiAntiforgeryToken]
    public async Task<ContactMessageDto> CreateMessage(ContactMessageWriteRequest request, CancellationToken ct)
    {
        var result = await service.CreateMessageAsync(request, ct);
        await auditService.LogAsync(request.Phone, "ContactMessage", request.Topic, "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpGet("seo/sitemap")]
    [ProducesResponseType<SeoSitemapDto>(StatusCodes.Status200OK)]
    public Task<SeoSitemapDto> Sitemap(CancellationToken ct) =>
        productService.SeoSitemapAsync(ct);

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
