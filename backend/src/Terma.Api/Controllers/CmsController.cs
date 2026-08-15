using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Cms;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;

namespace Terma.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminAuthorization.Policy)]
[Route("api/admin/cms")]
public sealed class CmsController(
    ICmsService service,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("pages")]
    public Task<IReadOnlyList<CmsPageSummaryDto>> Pages([FromQuery] string? search, [FromQuery] CmsPageStatus? status, CancellationToken ct) =>
        service.ListPagesAsync(search, status, ct);

    [HttpGet("pages/{id:guid}")]
    public async Task<ActionResult<CmsPageDetailDto>> Page(Guid id, CancellationToken ct) =>
        WithEtag(await service.GetPageAsync(id, ct));

    [HttpPost("pages")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Create(CreateCmsPageRequest request, CancellationToken ct)
    {
        var page = await service.CreatePageAsync(request, Actor, ct);
        Response.Headers.ETag = page.RowVersion;
        await auditService.LogAsync(Actor, "CreateCmsPage", page.Id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return CreatedAtAction(nameof(Page), new { id = page.Id }, page);
    }

    [HttpPut("pages/{id:guid}/draft")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Save(Guid id, SaveCmsDraftRequest request, CancellationToken ct)
    {
        var page = await service.SaveDraftAsync(id, request, IfMatch, Actor, ct);
        await auditService.LogAsync(Actor, "SaveCmsDraft", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return WithEtag(page);
    }

    [HttpPost("pages/{id:guid}/publish")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Publish(Guid id, CancellationToken ct)
    {
        var page = await service.PublishAsync(id, IfMatch, Actor, ct);
        await auditService.LogAsync(Actor, "PublishCmsPage", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return WithEtag(page);
    }

    [HttpPost("pages/{id:guid}/schedule")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Schedule(Guid id, ScheduleCmsPageRequest request, CancellationToken ct)
    {
        var page = await service.ScheduleAsync(id, request, IfMatch, Actor, ct);
        await auditService.LogAsync(Actor, "ScheduleCmsPage", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return WithEtag(page);
    }

    [HttpGet("pages/{id:guid}/revisions")]
    public Task<IReadOnlyList<CmsRevisionDto>> Revisions(Guid id, CancellationToken ct) =>
        service.RevisionsAsync(id, ct);

    [HttpPost("pages/{id:guid}/revisions/{revisionId:guid}/restore")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Restore(Guid id, Guid revisionId, CancellationToken ct)
    {
        var page = await service.RestoreAsync(id, revisionId, IfMatch, Actor, ct);
        await auditService.LogAsync(Actor, "RestoreCmsRevision", $"{id}:{revisionId}", "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return WithEtag(page);
    }

    [HttpDelete("pages/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveAsync(id, IfMatch, ct);
        await auditService.LogAsync(Actor, "ArchiveCmsPage", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    private string Actor => User.Identity?.Name ?? "admin";
    private string IfMatch => Request.Headers.IfMatch.ToString();

    private ActionResult<CmsPageDetailDto> WithEtag(CmsPageDetailDto page)
    {
        Response.Headers.ETag = page.RowVersion;
        return Ok(page);
    }

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}

[ApiController]
[AllowAnonymous]
[Route("api/store/cms")]
public sealed class PublicCmsController(ICmsService service) : ControllerBase
{
    [HttpGet("site")]
    public Task<CmsPublishedPageDto> Site(CancellationToken ct) => service.GetPublishedSiteAsync(ct);

    [HttpGet("pages/{slug}")]
    public Task<CmsPublishedPageDto> Page(string slug, CancellationToken ct) => service.GetPublishedPageAsync(slug, ct);
}
